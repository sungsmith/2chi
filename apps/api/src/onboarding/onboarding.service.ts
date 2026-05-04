import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { ExperienceType } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmOnboardingDto } from './dto/confirm-onboarding.dto';
import { OnboardingParseResultDto } from '@2chi/shared';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

interface CachePayload {
  experiences: OnboardingParseResultDto['experiences'];
  rawText: string;
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async parse(
    userId: string,
    file: Express.Multer.File,
  ): Promise<OnboardingParseResultDto> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'docx'].includes(ext)) {
      throw new BadRequestException('PDF 또는 Word 파일만 지원합니다.');
    }

    let text: string;
    if (ext === 'pdf') {
      const parsed = await pdfParse(file.buffer);
      text = parsed.text;
    } else {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    }

    const { experiences, confidence } = await this.aiService.parseResumeToExperiences(text);

    const parseId = randomUUID();
    const cacheKey = `onboarding:${userId}:${parseId}`;
    await this.cacheManager.set(cacheKey, { experiences, rawText: text }, THIRTY_MINUTES_MS);

    return { parseId, experiences, confidence };
  }

  async confirm(
    userId: string,
    dto: ConfirmOnboardingDto,
  ): Promise<{ createdCount: number; experienceIds: string[] }> {
    const cacheKey = `onboarding:${userId}:${dto.parseId}`;
    const cached = await this.cacheManager.get<CachePayload>(cacheKey);
    if (!cached) {
      throw new NotFoundException('파싱 결과가 만료되었습니다. 다시 업로드해주세요.');
    }

    // Pre-resolve tags outside the transaction (upsert is idempotent and safe)
    const tagMaps = await Promise.all(
      dto.experiences.map((exp) =>
        Promise.all(
          (exp.tags ?? []).map((name: string) =>
            this.prisma.tag.upsert({ where: { name }, update: {}, create: { name } }),
          ),
        ),
      ),
    );

    // Create all experiences atomically
    const created = await this.prisma.$transaction(
      dto.experiences.map((exp, i) =>
        this.prisma.experience.create({
          data: {
            userId,
            title: exp.title,
            type: exp.type as ExperienceType,
            companyName: exp.companyName ?? null,
            startDate: exp.startDate ? new Date(exp.startDate) : null,
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            situation: exp.situation ?? null,
            task: exp.task ?? null,
            action: exp.action ?? null,
            result: exp.result ?? null,
            resultMetric: exp.resultMetric ?? null,
            tags: { create: tagMaps[i].map((tag) => ({ tagId: tag.id })) },
          },
          select: { id: true },
        }),
      ),
    );

    await this.cacheManager.del(cacheKey);

    const experienceIds = created.map((e) => e.id);
    return { createdCount: experienceIds.length, experienceIds };
  }
}
