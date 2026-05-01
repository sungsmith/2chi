import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { FilesService } from '../files/files.service';
import { ExperiencesService } from '../experiences/experiences.service';
import { PortfolioDto, PortfolioSectionDto, PortfolioSectionType } from '@2chi/shared';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { CreatePortfolioSectionDto } from './dto/create-portfolio-section.dto';
import { UpdatePortfolioSectionDto } from './dto/update-portfolio-section.dto';

interface SectionContent {
  title: string;
  body: string;
}

type PrismaPortfolio = {
  id: string;
  userId: string;
  title: string;
  templateId: string | null;
  versionLabel: string | null;
  pdfUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  sections: Array<{
    id: string;
    portfolioId: string;
    experienceId: string | null;
    sectionType: string;
    order: number;
    content: unknown;
  }>;
};

type PrismaSection = {
  id: string;
  portfolioId: string;
  experienceId: string | null;
  sectionType: string;
  order: number;
  content: unknown;
};

@Injectable()
export class PortfoliosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly files: FilesService,
    private readonly experiencesService: ExperiencesService,
    @InjectQueue('portfolio') private readonly queue: Queue,
  ) {}

  async findAll(userId: string): Promise<PortfolioDto[]> {
    const items = await this.prisma.portfolio.findMany({
      where: { userId },
      include: { sections: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => this.toDto(item));
  }

  async findOne(id: string, userId: string): Promise<PortfolioDto> {
    const item = await this.prisma.portfolio.findUnique({
      where: { id },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    if (!item) throw new NotFoundException('포트폴리오를 찾을 수 없습니다.');
    if (item.userId !== userId) throw new ForbiddenException();
    return this.toDto(item);
  }

  async create(userId: string, dto: CreatePortfolioDto): Promise<PortfolioDto> {
    const item = await this.prisma.portfolio.create({
      data: {
        userId,
        title: dto.title,
        templateId: dto.templateId,
        versionLabel: dto.versionLabel,
      },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    return this.toDto(item);
  }

  async update(id: string, userId: string, dto: UpdatePortfolioDto): Promise<PortfolioDto> {
    await this.findOne(id, userId);
    const item = await this.prisma.portfolio.update({
      where: { id },
      data: dto,
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    return this.toDto(item);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.prisma.portfolio.delete({ where: { id } });
  }

  async createSection(
    portfolioId: string,
    userId: string,
    dto: CreatePortfolioSectionDto,
  ): Promise<PortfolioSectionDto> {
    await this.findOne(portfolioId, userId);
    const section = await this.prisma.portfolioSection.create({
      data: {
        portfolioId,
        sectionType: dto.type,
        order: dto.order,
        content: { title: dto.title, body: dto.content },
      },
    });
    return this.toSectionDto(section);
  }

  async updateSection(
    portfolioId: string,
    sectionId: string,
    userId: string,
    dto: UpdatePortfolioSectionDto,
  ): Promise<PortfolioSectionDto> {
    const portfolio = await this.findOne(portfolioId, userId);
    const existing = portfolio.sections.find((s) => s.id === sectionId);
    if (!existing) throw new NotFoundException('섹션을 찾을 수 없습니다.');

    const updated = await this.prisma.portfolioSection.update({
      where: { id: sectionId },
      data: {
        ...(dto.type !== undefined ? { sectionType: dto.type } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        content: {
          title: dto.title ?? existing.title,
          body: dto.content ?? existing.content,
        },
      },
    });
    return this.toSectionDto(updated);
  }

  async removeSection(portfolioId: string, sectionId: string, userId: string): Promise<void> {
    const portfolio = await this.findOne(portfolioId, userId);
    const existing = portfolio.sections.find((s) => s.id === sectionId);
    if (!existing) throw new NotFoundException('섹션을 찾을 수 없습니다.');
    await this.prisma.portfolioSection.delete({ where: { id: sectionId } });
  }

  async reorderSections(portfolioId: string, userId: string, sectionIds: string[]): Promise<void> {
    const portfolio = await this.findOne(portfolioId, userId);
    const validIds = new Set(portfolio.sections.map((s) => s.id));
    if (sectionIds.some((id) => !validIds.has(id))) {
      throw new BadRequestException('유효하지 않은 섹션 ID가 포함되어 있습니다.');
    }
    await this.prisma.$transaction(
      sectionIds.map((id, index) =>
        this.prisma.portfolioSection.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  async streamSectionDraft(
    portfolioId: string,
    sectionId: string,
    userId: string,
    res: Response,
  ): Promise<void> {
    const portfolio = await this.findOne(portfolioId, userId);
    const section = portfolio.sections.find((s) => s.id === sectionId);
    if (!section) throw new NotFoundException('섹션을 찾을 수 없습니다.');

    const allExperiences = await this.experiencesService.findAll(userId);
    const expData = allExperiences.map((e) => ({
      title: e.title,
      situation: e.situation ?? '',
      task: e.task ?? '',
      action: e.action ?? '',
      result: e.result ?? '',
    }));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const delta of this.ai.streamPortfolioSectionDraft(
        section.type,
        section.title,
        expData,
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

  async generatePdf(portfolioId: string, userId: string): Promise<{ jobId: string }> {
    await this.findOne(portfolioId, userId);
    const job = await this.queue.add('generate-pdf', { portfolioId });
    return { jobId: job.id.toString() };
  }

  async getPdfUrl(portfolioId: string, userId: string): Promise<string | null> {
    const item = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    if (!item) throw new NotFoundException('포트폴리오를 찾을 수 없습니다.');
    if (item.userId !== userId) throw new ForbiddenException();
    if (!item.pdfUrl) return null;
    return this.files.getSignedDownloadUrl(item.pdfUrl);
  }

  private toDto(item: PrismaPortfolio): PortfolioDto {
    return {
      id: item.id,
      userId: item.userId,
      title: item.title,
      templateId: item.templateId ?? '',
      versionLabel: item.versionLabel ?? '',
      pdfUrl: item.pdfUrl,
      sections: item.sections.map((s) => this.toSectionDto(s)),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private toSectionDto(section: PrismaSection): PortfolioSectionDto {
    const content = section.content as SectionContent;
    return {
      id: section.id,
      portfolioId: section.portfolioId,
      type: section.sectionType as PortfolioSectionType,
      title: content?.title ?? '',
      content: content?.body ?? '',
      order: section.order,
    };
  }
}
