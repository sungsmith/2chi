import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AnalyzeCompanyDto } from './dto/analyze-company.dto';

export const COMPANY_QUEUE = 'company';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function isCacheValid(analyzedAt: Date | null): boolean {
  if (!analyzedAt) return false;
  return Date.now() - new Date(analyzedAt).getTime() < CACHE_TTL_MS;
}

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    @InjectQueue(COMPANY_QUEUE) private companyQueue: Queue,
  ) {}

  async findAll(userId: string) {
    return this.prisma.company.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('기업 정보를 찾을 수 없습니다.');
    if (company.userId !== userId) throw new ForbiddenException();
    return company;
  }

  async enqueueAnalysis(userId: string, dto: AnalyzeCompanyDto) {
    const existing = await this.prisma.company.findFirst({
      where: { userId, name: dto.name },
    });

    if (isCacheValid(existing?.analyzedAt ?? null)) return { cached: true, company: existing };

    const job = await this.companyQueue.add(
      'analyze',
      { userId, ...dto },
      { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
    );

    return { cached: false, jobId: job.id };
  }

  async getJobStatus(jobId: string): Promise<{ status: string; progress?: number }> {
    const job = await this.companyQueue.getJob(jobId);
    if (!job) throw new NotFoundException('작업을 찾을 수 없습니다.');
    const state = await job.getState();
    const progress = job.progress();
    return { status: state, progress: typeof progress === 'number' ? progress : undefined };
  }

  async analyzeGap(companyId: string, jobPostingId: string, userId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('기업 정보를 찾을 수 없습니다.');
    if (company.userId !== userId) throw new ForbiddenException();

    const jobPosting = await this.prisma.jobPosting.findUnique({ where: { id: jobPostingId } });
    if (!jobPosting || jobPosting.userId !== userId) {
      throw new NotFoundException('채용공고를 찾을 수 없습니다.');
    }

    const experiences = await this.prisma.experience.findMany({
      where: { userId },
      include: { tags: { include: { tag: true } } },
    });

    const required = [...new Set([...jobPosting.requiredCompetencies, ...company.keyCompetencies])];
    const preferred = jobPosting.preferredCompetencies;

    const myExperiences = experiences.map((e) => ({
      title: e.title,
      tags: e.tags.map((et) => et.tag.name),
      situation: e.situation ?? undefined,
      action: e.action ?? undefined,
    }));

    return this.aiService.analyzeCompetencyGap(required, preferred, myExperiences);
  }

  async analyzeAndUpsert(userId: string, dto: AnalyzeCompanyDto) {
    const existing = await this.prisma.company.findFirst({
      where: { userId, name: dto.name },
    });

    if (isCacheValid(existing?.analyzedAt ?? null)) return existing;

    const analysis = await this.aiService.analyzeCompany(
      dto.name,
      dto.jobTitle,
      dto.additionalContext,
    );

    if ('error' in analysis) {
      if (analysis.error === 'invalid_company') {
        throw new BadRequestException('유효한 기업명을 입력해주세요.');
      }
      throw new Error(analysis.message);
    }

    if (existing) {
      return this.prisma.company.update({
        where: { id: existing.id },
        data: {
          officialInfo: {
            summary: analysis.summary,
            products: analysis.products,
            recentNews: analysis.recentNews,
          },
          keyCompetencies: analysis.keyCompetencies,
          analyzedAt: new Date(),
        },
      });
    }

    return this.prisma.company.create({
      data: {
        userId,
        name: dto.name,
        officialInfo: {
          summary: analysis.summary,
          products: analysis.products,
          recentNews: analysis.recentNews,
        },
        keyCompetencies: analysis.keyCompetencies,
        analyzedAt: new Date(),
      },
    });
  }
}
