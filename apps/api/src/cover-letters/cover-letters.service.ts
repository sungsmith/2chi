import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ExperiencesService } from '../experiences/experiences.service';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { CreateCoverLetterItemDto } from './dto/create-cover-letter-item.dto';
import { buildDraftPrompt } from '../ai/prompts/cover-letter.prompt';

export const COVER_LETTER_QUEUE = 'cover-letter';

const INCLUDE_ITEMS = {
  items: { orderBy: { order: 'asc' as const } },
} as const;

@Injectable()
export class CoverLettersService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private experiencesService: ExperiencesService,
    @InjectQueue(COVER_LETTER_QUEUE) private coverLetterQueue: Queue,
  ) {}

  async findAll(userId: string) {
    return this.prisma.coverLetter.findMany({
      where: { userId },
      include: INCLUDE_ITEMS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const coverLetter = await this.prisma.coverLetter.findUnique({
      where: { id },
      include: { ...INCLUDE_ITEMS, jobPosting: true },
    });
    if (!coverLetter) throw new NotFoundException('자소서를 찾을 수 없습니다.');
    if (coverLetter.userId !== userId) throw new ForbiddenException();
    return coverLetter;
  }

  async create(userId: string, dto: CreateCoverLetterDto) {
    return this.prisma.coverLetter.create({
      data: { ...dto, userId },
      include: INCLUDE_ITEMS,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.coverLetter.delete({ where: { id } });
  }

  async addItem(coverLetterId: string, userId: string, dto: CreateCoverLetterItemDto) {
    await this.findOne(coverLetterId, userId);
    return this.prisma.coverLetterItem.create({
      data: { ...dto, coverLetterId },
    });
  }

  async updateItemContent(coverLetterId: string, itemId: string, userId: string, userContent: string) {
    await this.findOne(coverLetterId, userId);
    return this.prisma.coverLetterItem.update({
      where: { id: itemId },
      data: { userContent },
    });
  }

  async recommendExperiences(coverLetterId: string, itemId: string, userId: string) {
    await this.findOne(coverLetterId, userId);

    const item = await this.prisma.coverLetterItem.findUnique({ where: { id: itemId } });
    if (!item || item.coverLetterId !== coverLetterId) {
      throw new NotFoundException('자소서 항목을 찾을 수 없습니다.');
    }

    const experiences = await this.experiencesService.findAll(userId);
    if (!experiences.length) return [];

    const expSummaries = experiences.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type as string,
      situation: e.situation,
      task: e.task,
      action: e.action,
      result: e.result,
      tags: e.tags.map((t) => t.tag.name),
    }));

    return this.aiService.rankExperiences(item.question, expSummaries);
  }

  async streamDraft(
    coverLetterId: string,
    itemId: string,
    userId: string,
    res: Response,
    experienceIds?: string[],
  ) {
    const coverLetter = await this.findOne(coverLetterId, userId);

    const item = await this.prisma.coverLetterItem.findUnique({ where: { id: itemId } });
    if (!item || item.coverLetterId !== coverLetterId) {
      throw new NotFoundException('자소서 항목을 찾을 수 없습니다.');
    }
    if (!item.question) throw new BadRequestException('질문이 없는 항목입니다.');

    const allExperiences = await this.experiencesService.findAll(userId);
    const experiences = experienceIds?.length
      ? allExperiences.filter((e) => experienceIds.includes(e.id))
      : allExperiences;

    const expSummaries = experiences.map((e) => ({
      title: e.title,
      type: e.type,
      situation: e.situation,
      task: e.task,
      action: e.action,
      result: e.result,
      tags: e.tags.map((t) => t.tag.name),
    }));

    let companyInfo: { summary?: string; keyCompetencies?: string[] } | null = null;
    if (coverLetter.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: coverLetter.companyId },
      });
      if (company?.officialInfo) {
        companyInfo = {
          summary: (company.officialInfo as Record<string, string>).summary,
          keyCompetencies: company.keyCompetencies as string[],
        };
      }
    }

    const prompt = buildDraftPrompt(
      item.question,
      item.charLimit,
      expSummaries,
      coverLetter.jobPosting?.title,
      undefined,
      companyInfo ?? undefined,
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = await this.aiService.streamChatCompletion(prompt);
      let fullText = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) {
          fullText += delta;
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      }
      await this.prisma.coverLetterItem.update({
        where: { id: itemId },
        data: { aiDraft: fullText },
      });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ error: true, message: '생성 중 오류가 발생했습니다.' })}\n\n`);
    } finally {
      res.end();
    }
  }

  async enqueueMatching(coverLetterId: string, userId: string) {
    await this.findOne(coverLetterId, userId);
    const job = await this.coverLetterQueue.add(
      'calculate-matching',
      { coverLetterId, userId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
    return { jobId: job.id };
  }

  async calculateMatching(coverLetterId: string, userId: string) {
    await this.findOne(coverLetterId, userId);
    const coverLetter = await this.prisma.coverLetter.findUnique({
      where: { id: coverLetterId },
      include: { jobPosting: true },
    });
    const requiredCompetencies = (coverLetter?.jobPosting?.requiredCompetencies ?? []) as string[];

    if (!requiredCompetencies.length) {
      return { score: 0, matchedKeywords: [], missingKeywords: [], summary: '채용공고 역량 정보가 없습니다.' };
    }

    const experiences = await this.experiencesService.findAll(userId);
    const expData = experiences.map((e) => ({
      title: e.title,
      action: e.action,
      result: e.result,
      tags: e.tags.map((t) => t.tag.name),
    }));

    const result = await this.aiService.calculateMatchingScore(requiredCompetencies, expData);

    await this.prisma.coverLetter.update({
      where: { id: coverLetterId },
      data: { matchingScore: result.score },
    });

    return result;
  }
}
