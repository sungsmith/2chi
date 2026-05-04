import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { FilesService } from '../files/files.service';
import { ExperiencesService } from '../experiences/experiences.service';
import { CreateCareerDescriptionDto } from './dto/create-career-description.dto';
import { UpdateCareerDescriptionDto } from './dto/update-career-description.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { GenerateSectionDraftDto } from './dto/generate-section-draft.dto';
import {
  SectionType,
  SectionContent,
  CareerDescriptionSectionDto,
  CareerDescriptionDto,
} from '@2chi/shared';

const DEFAULT_SECTIONS = [
  { sectionType: 'INTRO', order: 0, content: { heading: '자기소개', body: '' } },
  { sectionType: 'EXPERIENCE', order: 1, content: { heading: '주요 경력', body: '' } },
  { sectionType: 'SKILL', order: 2, content: { heading: '보유 기술', body: '' } },
];

type PrismaCareerDescription = {
  id: string;
  userId: string;
  title: string;
  versionLabel: string | null;
  targetJobType: string | null;
  pdfUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  sections: Array<{
    id: string;
    careerDescriptionId: string;
    experienceId: string | null;
    sectionType: string;
    order: number;
    content: unknown;
  }>;
};

@Injectable()
export class CareerDescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly filesService: FilesService,
    private readonly experiencesService: ExperiencesService,
  ) {}

  async findAll(userId: string): Promise<CareerDescriptionDto[]> {
    const items = await this.prisma.careerDescription.findMany({
      where: { userId },
      include: { sections: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => this.toDto(item));
  }

  async findOne(id: string, userId: string): Promise<CareerDescriptionDto> {
    const item = await this.prisma.careerDescription.findUnique({
      where: { id },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    if (!item) throw new NotFoundException('경력기술서를 찾을 수 없습니다.');
    if (item.userId !== userId) throw new ForbiddenException();
    return this.toDto(item);
  }

  async create(userId: string, dto: CreateCareerDescriptionDto): Promise<CareerDescriptionDto> {
    const item = await this.prisma.careerDescription.create({
      data: {
        userId,
        title: dto.title,
        versionLabel: dto.versionLabel,
        targetJobType: dto.targetJobType,
        sections: {
          create: DEFAULT_SECTIONS,
        },
      },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    return this.toDto(item);
  }

  async update(id: string, userId: string, dto: UpdateCareerDescriptionDto): Promise<CareerDescriptionDto> {
    await this.findOne(id, userId);
    const item = await this.prisma.careerDescription.update({
      where: { id },
      data: dto,
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    return this.toDto(item);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.prisma.careerDescription.delete({ where: { id } });
  }

  async streamSectionDraft(
    id: string,
    sectionId: string,
    userId: string,
    dto: GenerateSectionDraftDto,
    res: Response,
  ): Promise<void> {
    const careerDesc = await this.findOne(id, userId);
    const section = careerDesc.sections.find((s) => s.id === sectionId);
    if (!section) throw new NotFoundException('섹션을 찾을 수 없습니다.');

    const allExperiences = await this.experiencesService.findAll(userId);
    const experiences = dto.experienceIds?.length
      ? allExperiences.filter((e) => dto.experienceIds!.includes(e.id))
      : allExperiences;

    const expData = experiences.map((e) => ({
      title: e.title,
      type: e.type as string,
      companyName: e.companyName ?? undefined,
      situation: e.situation ?? undefined,
      task: e.task ?? undefined,
      action: e.action ?? undefined,
      result: e.result ?? undefined,
      resultMetric: e.resultMetric ?? undefined,
      tags: e.tags.map((t) => t.tag.name),
    }));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const delta of this.aiService.streamCareerDescSectionDraft(
        section.sectionType,
        expData,
        dto.targetJobType ?? careerDesc.targetJobType ?? undefined,
      )) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ error: true, message: '생성 중 오류가 발생했습니다.' })}\n\n`);
    } finally {
      res.end();
    }
  }

  async updateSection(
    id: string,
    sectionId: string,
    userId: string,
    dto: UpdateSectionDto,
  ): Promise<CareerDescriptionSectionDto> {
    const careerDesc = await this.findOne(id, userId);
    const section = careerDesc.sections.find((s) => s.id === sectionId);
    if (!section) throw new NotFoundException('섹션을 찾을 수 없습니다.');

    const updated = await this.prisma.careerDescriptionSection.update({
      where: { id: sectionId },
      data: {
        content: { heading: dto.content.heading, body: dto.content.body },
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
    });

    return {
      id: updated.id,
      careerDescriptionId: updated.careerDescriptionId,
      experienceId: updated.experienceId,
      sectionType: updated.sectionType as SectionType,
      order: updated.order,
      content: updated.content as unknown as SectionContent,
    };
  }

  async generatePdf(id: string, userId: string): Promise<string> {
    const careerDesc = await this.findOne(id, userId);

    const templatePath = path.join(__dirname, 'templates', 'career-desc.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);
    const html = template({
      title: careerDesc.title,
      versionLabel: careerDesc.versionLabel,
      targetJobType: careerDesc.targetJobType,
      sections: careerDesc.sections,
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chromium = require('@sparticuz/chromium');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = require('puppeteer-core');

    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    let pdfBuffer: Buffer;
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      pdfBuffer = Buffer.from(pdf);
    } finally {
      await browser.close();
    }

    const key = `career-desc/${id}/document.pdf`;
    await this.filesService.uploadBuffer(pdfBuffer, key, 'application/pdf');

    await this.prisma.careerDescription.update({
      where: { id },
      data: { pdfUrl: key },
    });

    return this.filesService.getSignedDownloadUrl(key);
  }

  private toDto(item: PrismaCareerDescription): CareerDescriptionDto {
    return {
      id: item.id,
      userId: item.userId,
      title: item.title,
      versionLabel: item.versionLabel,
      targetJobType: item.targetJobType,
      pdfUrl: item.pdfUrl,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      sections: item.sections.map((s) => ({
        id: s.id,
        careerDescriptionId: s.careerDescriptionId,
        experienceId: s.experienceId,
        sectionType: s.sectionType as SectionType,
        order: s.order,
        content: s.content as SectionContent,
      })),
    };
  }
}
