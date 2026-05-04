import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AnalyzeCompanyDto } from './dto/analyze-company.dto';
import type { CompanyDto, CompanyJobInfo, CompetencyGapDto } from '@2chi/shared';

export const COMPANY_QUEUE = 'company';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function isCacheValid(analyzedAt: Date | null): boolean {
  if (!analyzedAt) return false;
  return Date.now() - new Date(analyzedAt).getTime() < CACHE_TTL_MS;
}

type PrismaCompany = {
  id: string;
  userId: string;
  name: string;
  industry: string | null;
  officialInfo: unknown;
  unofficialInfo: unknown;
  keyCompetencies: string[];
  analyzedAt: Date | null;
  createdAt: Date;
};

type UnofficialInfo = {
  jobInfo?: CompanyJobInfo | null;
  gapResult?: CompetencyGapDto | null;
};

function toDto(company: PrismaCompany): CompanyDto {
  const unofficial = (company.unofficialInfo ?? {}) as UnofficialInfo;
  return {
    id: company.id,
    userId: company.userId,
    name: company.name,
    industry: company.industry,
    officialInfo: company.officialInfo as CompanyDto['officialInfo'],
    keyCompetencies: company.keyCompetencies,
    jobInfo: unofficial.jobInfo ?? null,
    gapResult: unofficial.gapResult ?? null,
    analyzedAt: company.analyzedAt?.toISOString() ?? null,
    createdAt: company.createdAt.toISOString(),
  };
}

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    @InjectQueue(COMPANY_QUEUE) private companyQueue: Queue,
  ) {}

  async findAll(userId: string): Promise<CompanyDto[]> {
    const companies = await this.prisma.company.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return companies.map(toDto);
  }

  async findOne(id: string, userId: string): Promise<CompanyDto> {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('기업 정보를 찾을 수 없습니다.');
    if (company.userId !== userId) throw new ForbiddenException();
    return toDto(company);
  }

  async enqueueAnalysis(userId: string, dto: AnalyzeCompanyDto) {
    const existing = await this.prisma.company.findFirst({
      where: { userId, name: dto.name },
    });

    if (isCacheValid(existing?.analyzedAt ?? null)) return { cached: true, company: toDto(existing!) };

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

  async analyzeAndUpsert(userId: string, dto: AnalyzeCompanyDto): Promise<PrismaCompany> {
    const existing = await this.prisma.company.findFirst({
      where: { userId, name: dto.name },
    });

    if (isCacheValid(existing?.analyzedAt ?? null)) return existing!;

    // Step 1: 기업 분석 + 채용공고 파싱 (통합 AI 호출)
    const analysis = await this.aiService.analyzeCompany(
      dto.name,
      dto.jobPostingText,
      dto.additionalContext,
    );

    if ('error' in analysis) {
      if (analysis.error === 'invalid_company') {
        throw new BadRequestException('유효한 기업명을 입력해주세요.');
      }
      throw new Error(analysis.message);
    }

    // Step 2: jobInfo 구성 (채용공고가 있을 때만 의미있는 값)
    const jobInfo: CompanyJobInfo | null =
      dto.jobPostingText && analysis.jobTitle
        ? {
            jobTitle: analysis.jobTitle,
            requiredCompetencies: analysis.requiredCompetencies,
            preferredCompetencies: analysis.preferredCompetencies,
            jobSummary: analysis.jobSummary,
          }
        : null;

    // Step 3: 갭 분석 자동 실행 (역량 + 경험이 있을 때만)
    let gapResult: CompetencyGapDto | null = null;
    const required = [
      ...new Set([...analysis.requiredCompetencies, ...analysis.keyCompetencies]),
    ];
    const preferred = analysis.preferredCompetencies;

    if (required.length > 0) {
      const experiences = await this.prisma.experience.findMany({
        where: { userId },
        include: { tags: { include: { tag: true } } },
      });

      if (experiences.length > 0) {
        const myExperiences = experiences.map((e) => ({
          title: e.title,
          tags: e.tags.map((et) => et.tag.name),
          situation: e.situation ?? undefined,
          action: e.action ?? undefined,
        }));
        gapResult = await this.aiService.analyzeCompetencyGap(required, preferred, myExperiences);
      }
    }

    const officialInfo = {
      summary: analysis.summary,
      products: analysis.products,
      recentNews: analysis.recentNews,
      culture: analysis.culture ?? null,
    };

    const unofficialInfo: UnofficialInfo = { jobInfo, gapResult };

    const unofficialInfoJson = unofficialInfo as unknown as Parameters<typeof this.prisma.company.create>[0]['data']['unofficialInfo'];

    if (existing) {
      return this.prisma.company.update({
        where: { id: existing.id },
        data: {
          officialInfo,
          keyCompetencies: analysis.keyCompetencies,
          unofficialInfo: unofficialInfoJson,
          analyzedAt: new Date(),
        },
      });
    }

    return this.prisma.company.create({
      data: {
        userId,
        name: dto.name,
        officialInfo,
        keyCompetencies: analysis.keyCompetencies,
        unofficialInfo: unofficialInfoJson,
        analyzedAt: new Date(),
      },
    });
  }
}
