# Company + Job Analysis Unified Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기업 분석 시 채용공고 텍스트를 함께 입력받아 기업 공개정보 + 직무 요건을 통합 분석하고, 사용자의 경험과 역량 갭 분석을 자동으로 실행해 저장한다.

**Architecture:** `analyzeCompanySchema`에 `jobPostingText` 필드 추가 → AI 프롬프트가 회사명(기업 서칭)과 채용공고(직무 요건 추출)를 동시에 분석 → Bull Queue Processor에서 분석 결과와 갭 분석을 `unofficialInfo` JSON 컬럼에 저장 → 프론트엔드 폼에 textarea 추가, 결과 페이지에서 갭 분석 자동 표시. DB 마이그레이션 없이 기존 `unofficialInfo Json?` 컬럼 재사용.

**Tech Stack:** NestJS, Prisma (PostgreSQL), OpenAI SDK (GPT-4o), Bull Queue, Next.js 14, TanStack Query, React Hook Form + Zod, shadcn/ui

---

## 파일 맵

### 수정할 파일

| 파일 | 변경 내용 |
|------|-----------|
| `packages/shared/src/schemas/company.schema.ts` | `jobPostingText` 필드 추가 |
| `packages/shared/src/types/company.ts` | `CompanyJobInfo` 인터페이스 추가, `CompanyDto`에 `jobInfo`·`gapResult` 추가 |
| `apps/api/src/ai/prompts/company.prompt.ts` | 채용공고 텍스트를 받아 통합 분석하는 프롬프트로 교체 |
| `apps/api/src/ai/ai.service.ts` | `analyzeCompany` 시그니처·리턴타입 확장 |
| `apps/api/src/companies/dto/analyze-company.dto.ts` | `jobPostingText` 필드 추가 |
| `apps/api/src/companies/company.processor.ts` | 잡 데이터 타입에 `jobPostingText` 포함 |
| `apps/api/src/companies/companies.service.ts` | `analyzeAndUpsert` — 통합 AI 결과 저장 + 갭 분석 자동 실행, `toDto()` 헬퍼 추가 |
| `apps/web/components/company/analyze-form.tsx` | `jobPostingText` textarea 추가, 기존 `jobTitle` 필드 제거 |
| `apps/web/app/(dashboard)/company/[id]/page.tsx` | `jobInfo`·`gapResult` 섹션 표시, 수동 갭 분석 섹션 제거 |

---

## Task 1: Shared 타입 + 스키마 업데이트

**Files:**
- Modify: `packages/shared/src/schemas/company.schema.ts`
- Modify: `packages/shared/src/types/company.ts`

- [ ] **Step 1: `analyzeCompanySchema`에 `jobPostingText` 추가**

`packages/shared/src/schemas/company.schema.ts` 전체를 아래로 교체:

```typescript
import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(1, '기업명을 입력하세요.').max(100),
  industry: z.string().max(50).optional(),
});

export const analyzeCompanySchema = z.object({
  name: z.string().min(1, '기업명을 입력하세요.').max(100),
  jobPostingText: z.string().max(100_000).optional(),
  additionalContext: z.string().max(1000).optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type AnalyzeCompanyInput = z.infer<typeof analyzeCompanySchema>;
```

- [ ] **Step 2: `CompanyDto`에 `CompanyJobInfo`·`gapResult` 추가**

`packages/shared/src/types/company.ts` 전체를 아래로 교체:

```typescript
export interface CompanyOfficialInfo {
  summary: string;
  products: string[];
  recentNews: string[];
  culture?: string;
}

export interface CompanyJobInfo {
  jobTitle: string;
  requiredCompetencies: string[];
  preferredCompetencies: string[];
  jobSummary: string;
}

export interface CompetencyGapResult {
  required: string[];
  preferred: string[];
  myMatched: string[];
  myMissing: string[];
  score: number;
  summary: string;
}

export interface CompanyDto {
  id: string;
  userId: string;
  name: string;
  industry: string | null;
  officialInfo: CompanyOfficialInfo | null;
  keyCompetencies: string[];
  jobInfo: CompanyJobInfo | null;
  gapResult: CompetencyGapResult | null;
  analyzedAt: string | null;
  createdAt: string;
}

export interface MatchingScoreDto {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  summary: string;
}
```

- [ ] **Step 3: shared 빌드 확인**

```bash
cd packages/shared && pnpm build
# 타입 에러 없음
```

- [ ] **Step 4: 커밋**

```bash
git add packages/shared/src/schemas/company.schema.ts packages/shared/src/types/company.ts
git commit -m "feat(shared): add jobPostingText to analyzeCompanySchema, CompanyJobInfo + gapResult to CompanyDto"
```

---

## Task 2: AI 프롬프트 + AiService 업데이트

**Files:**
- Modify: `apps/api/src/ai/prompts/company.prompt.ts`
- Modify: `apps/api/src/ai/ai.service.ts`

- [ ] **Step 1: 통합 분석 프롬프트로 교체**

`apps/api/src/ai/prompts/company.prompt.ts` 전체를 아래로 교체:

```typescript
export function buildCompanyAnalysisPrompt(
  companyName: string,
  jobPostingText?: string,
  additionalContext?: string,
): string {
  const jobSection = jobPostingText
    ? `\n채용공고 전문:\n"""\n${jobPostingText.slice(0, 8000)}\n"""\n`
    : '';

  const contextSection = additionalContext
    ? `\n추가 정보:\n${additionalContext}\n`
    : '';

  return `당신은 취업 컨설턴트입니다. 아래 정보를 바탕으로 기업과 채용 직무를 통합 분석하여 JSON을 반환하세요.

기업명: ${companyName}
${jobSection}${contextSection}
다음 JSON 스키마를 정확히 따르세요:
{
  "summary": "200자 이상의 회사 소개 (설립연도, 주요 사업, 시장 위치 포함)",
  "products": ["주요 제품/서비스 5개 이상 (구체적인 이름과 설명 포함)"],
  "recentNews": ["최근 1~2년 주요 동향 5개 이상 (성장, 인수, 출시 등)"],
  "culture": "조직 문화 설명 (일하는 방식, 가치관, 복지 등 100자 이상)",
  "keyCompetencies": ["기업이 전반적으로 요구하는 핵심 역량 5개 이상 (구체적)"],
  "jobTitle": "${jobPostingText ? '채용공고에서 추출한 직무명' : ''}",
  "requiredCompetencies": ["채용공고 기반 필수 역량 목록. 공고 없으면 빈 배열 []"],
  "preferredCompetencies": ["채용공고 기반 우대 역량 목록. 공고 없으면 빈 배열 []"],
  "jobSummary": "직무 한 줄 요약. 공고 없으면 빈 문자열"
}

분석 규칙:
- keyCompetencies: 기업 문화·전략에서 도출한 공통 역량 (공고 유무 무관)
- requiredCompetencies / preferredCompetencies: 채용공고가 있을 때만 채움
- 공고와 기업 분석이 모두 있을 때: 두 소스를 종합해 keyCompetencies를 더 구체화할 것
- 절대 허구의 내용을 사실인 것처럼 작성하지 마라
- 기업명이 무의미한 문자열인 경우에만 아래처럼 응답:
  {"error": "invalid_company", "message": "유효한 기업명을 입력해주세요."}
- JSON 외의 텍스트 출력 금지`;
}
```

- [ ] **Step 2: `AiService.analyzeCompany` 시그니처·리턴타입 업데이트**

`apps/api/src/ai/ai.service.ts`의 `analyzeCompany` 메서드를 아래로 교체 (기존 56~96번 줄):

```typescript
async analyzeCompany(
  companyName: string,
  jobPostingText?: string,
  additionalContext?: string,
): Promise<
  | {
      summary: string;
      products: string[];
      recentNews: string[];
      culture: string | null;
      keyCompetencies: string[];
      jobTitle: string;
      requiredCompetencies: string[];
      preferredCompetencies: string[];
      jobSummary: string;
    }
  | { error: string; message: string }
> {
  try {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: buildCompanyAnalysisPrompt(companyName, jobPostingText, additionalContext),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });
    const content = response.choices[0].message.content;
    if (!content) throw new Error('AI 응답이 없습니다.');
    return JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('AI 응답 파싱에 실패했습니다.');
    }
    throw err;
  }
}
```

- [ ] **Step 3: API 빌드 확인**

```bash
cd apps/api && pnpm build
# 컴파일 에러 없음
```

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/ai/prompts/company.prompt.ts apps/api/src/ai/ai.service.ts
git commit -m "feat(ai): unified company + job posting analysis prompt and service method"
```

---

## Task 3: API DTO · Processor · Service 업데이트

**Files:**
- Modify: `apps/api/src/companies/dto/analyze-company.dto.ts`
- Modify: `apps/api/src/companies/company.processor.ts`
- Modify: `apps/api/src/companies/companies.service.ts`

- [ ] **Step 1: `AnalyzeCompanyDto`에 `jobPostingText` 추가**

`apps/api/src/companies/dto/analyze-company.dto.ts` 전체를 아래로 교체:

```typescript
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class AnalyzeCompanyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  jobPostingText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalContext?: string;
}
```

- [ ] **Step 2: `company.processor.ts` 잡 데이터 타입에 `jobPostingText` 추가**

`apps/api/src/companies/company.processor.ts` 전체를 아래로 교체:

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { CompaniesService, COMPANY_QUEUE } from './companies.service';

@Processor(COMPANY_QUEUE)
export class CompanyProcessor {
  private readonly logger = new Logger(CompanyProcessor.name);

  constructor(private companiesService: CompaniesService) {}

  @Process('analyze')
  async handleAnalyze(
    job: Job<{
      userId: string;
      name: string;
      jobPostingText?: string;
      additionalContext?: string;
    }>,
  ) {
    const { userId, name, jobPostingText, additionalContext } = job.data;
    try {
      await this.companiesService.analyzeAndUpsert(userId, {
        name,
        jobPostingText,
        additionalContext,
      });
    } catch (err) {
      this.logger.error(`Job ${job.id} failed: ${(err as Error).message}`, (err as Error).stack);
      throw err;
    }
  }
}
```

- [ ] **Step 3: 테스트 작성 (analyzeAndUpsert 핵심 케이스)**

`apps/api/src/companies/companies.service.spec.ts` 파일을 아래 내용으로 생성:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CompaniesService, COMPANY_QUEUE } from './companies.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

const mockPrisma = {
  company: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  experience: { findMany: jest.fn() },
};

const mockAiService = {
  analyzeCompany: jest.fn(),
  analyzeCompetencyGap: jest.fn(),
};

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  getJob: jest.fn(),
};

describe('CompaniesService', () => {
  let service: CompaniesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAiService },
        { provide: getQueueToken(COMPANY_QUEUE), useValue: mockQueue },
      ],
    }).compile();
    service = module.get<CompaniesService>(CompaniesService);
  });

  describe('analyzeAndUpsert', () => {
    const userId = 'user-1';
    const dto = { name: '카카오', jobPostingText: '프론트엔드 개발자 채용...', additionalContext: undefined };

    const aiResult = {
      summary: '카카오 요약',
      products: ['카카오톡'],
      recentNews: ['AI 투자'],
      culture: '수평적 조직문화',
      keyCompetencies: ['커뮤니케이션', 'React'],
      jobTitle: '프론트엔드 개발자',
      requiredCompetencies: ['React', 'TypeScript'],
      preferredCompetencies: ['Next.js'],
      jobSummary: '프론트엔드 개발 담당',
    };

    const gapResult = {
      required: ['React', 'TypeScript'],
      preferred: ['Next.js'],
      myMatched: ['React'],
      myMissing: ['TypeScript'],
      score: 60,
      summary: 'React 강점, TypeScript 보강 필요',
    };

    it('새 기업 생성 시 jobInfo + gapResult를 unofficialInfo에 저장한다', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);
      mockAiService.analyzeCompany.mockResolvedValue(aiResult);
      mockPrisma.experience.findMany.mockResolvedValue([
        {
          title: '카카오 인턴',
          tags: [{ tag: { name: 'React' } }],
          situation: '...',
          action: '...',
        },
      ]);
      mockAiService.analyzeCompetencyGap.mockResolvedValue(gapResult);
      mockPrisma.company.create.mockResolvedValue({ id: 'co-1' });

      await service.analyzeAndUpsert(userId, dto);

      expect(mockAiService.analyzeCompany).toHaveBeenCalledWith('카카오', dto.jobPostingText, undefined);
      expect(mockPrisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unofficialInfo: expect.objectContaining({
              jobInfo: expect.objectContaining({ jobTitle: '프론트엔드 개발자' }),
              gapResult: expect.objectContaining({ score: 60 }),
            }),
          }),
        }),
      );
    });

    it('경험이 없으면 gapResult를 null로 저장한다', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);
      mockAiService.analyzeCompany.mockResolvedValue(aiResult);
      mockPrisma.experience.findMany.mockResolvedValue([]);
      mockPrisma.company.create.mockResolvedValue({ id: 'co-1' });

      await service.analyzeAndUpsert(userId, dto);

      expect(mockAiService.analyzeCompetencyGap).not.toHaveBeenCalled();
      expect(mockPrisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unofficialInfo: expect.objectContaining({ gapResult: null }),
          }),
        }),
      );
    });

    it('AI가 error를 반환하면 BadRequestException을 던진다', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);
      mockAiService.analyzeCompany.mockResolvedValue({ error: 'invalid_company', message: '유효한 기업명을 입력해주세요.' });

      await expect(service.analyzeAndUpsert(userId, dto)).rejects.toThrow('유효한 기업명을 입력해주세요.');
    });
  });

  describe('findOne', () => {
    it('존재하지 않는 기업 조회 시 NotFoundException을 던진다', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('다른 유저의 기업 조회 시 ForbiddenException을 던진다', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ id: 'co-1', userId: 'other-user', unofficialInfo: null, keyCompetencies: [] });
      await expect(service.findOne('co-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
```

- [ ] **Step 4: 테스트 실행 (RED 확인)**

```bash
cd apps/api && pnpm test --testPathPattern=companies.service.spec --no-coverage 2>&1 | tail -20
# 실패 예상: analyzeAndUpsert에 아직 jobInfo/gapResult 저장 로직 없음
```

- [ ] **Step 5: `companies.service.ts` 전체 교체 — 통합 분석 + 자동 갭 분석**

`apps/api/src/companies/companies.service.ts` 전체를 아래로 교체:

```typescript
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AnalyzeCompanyDto } from './dto/analyze-company.dto';
import type { CompanyDto, CompanyJobInfo, CompetencyGapResult } from '@2chi/shared';

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
  jobInfo?: CompanyJobInfo;
  gapResult?: CompetencyGapResult | null;
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

    // Step 3: 갭 분석 자동 실행 (경험이 있을 때만)
    let gapResult: CompetencyGapResult | null = null;
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

    if (existing) {
      return this.prisma.company.update({
        where: { id: existing.id },
        data: {
          officialInfo,
          keyCompetencies: analysis.keyCompetencies,
          unofficialInfo,
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
        unofficialInfo,
        analyzedAt: new Date(),
      },
    });
  }
}
```

- [ ] **Step 6: 테스트 실행 (GREEN 확인)**

```bash
cd apps/api && pnpm test --testPathPattern=companies.service.spec --no-coverage 2>&1 | tail -20
# 모든 테스트 통과
```

- [ ] **Step 7: 빌드 확인**

```bash
cd apps/api && pnpm build
# 컴파일 에러 없음
```

- [ ] **Step 8: 커밋**

```bash
git add apps/api/src/companies/
git commit -m "feat(api): unified company+job analysis with auto gap result stored in unofficialInfo"
```

---

## Task 4: 프론트엔드 훅 업데이트

**Files:**
- Modify: `apps/web/hooks/use-companies.ts`

- [ ] **Step 1: `useAnalyzeCompany` 반환 타입 확인 및 `useCompanyJobStatus` 존재 확인**

현재 `apps/web/hooks/use-companies.ts`에 아래 내용이 있는지 확인:

```bash
grep -n "AnalyzeResult\|useCompanyJobStatus\|jobId" apps/web/hooks/use-companies.ts
```

이미 `AnalyzeResult = { cached: true; company: CompanyDto } | { cached: false; jobId: string }` 패턴이 있으면 Task 4 완료. 없으면 아래를 적용.

- [ ] **Step 2: 훅 파일 전체 교체 (필요한 경우만)**

`apps/web/hooks/use-companies.ts` 전체를 아래로 교체:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CompanyDto, MatchingScoreDto, AnalyzeCompanyInput } from '@2chi/shared';

const CO_KEY = ['companies'] as const;

type AnalyzeResult =
  | { cached: true; company: CompanyDto }
  | { cached: false; jobId: string };

export function useCompanies() {
  return useQuery({
    queryKey: CO_KEY,
    queryFn: async () => {
      const res = await api.get<CompanyDto[]>('/companies');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: [...CO_KEY, id],
    queryFn: async () => {
      const res = await api.get<CompanyDto>(`/companies/${id}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useAnalyzeCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: AnalyzeCompanyInput): Promise<AnalyzeResult> => {
      const res = await api.post<AnalyzeResult>('/companies/analyze', data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CO_KEY }),
  });
}

export function useCompanyJobStatus(jobId: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: [...CO_KEY, 'job', jobId],
    queryFn: async () => {
      const res = await api.get<{ status: string; progress?: number }>(
        `/companies/jobs/${jobId}`,
      );
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') {
        qc.invalidateQueries({ queryKey: CO_KEY });
        return false;
      }
      return 2000;
    },
  });
}

export function useMatchingScore(coverLetterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.get<MatchingScoreDto>(`/cover-letters/${coverLetterId}/matching`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cover-letters', coverLetterId] }),
  });
}
```

- [ ] **Step 3: 웹 빌드 확인**

```bash
cd apps/web && pnpm build 2>&1 | tail -10
# 타입 에러 없음
```

- [ ] **Step 4: 커밋**

```bash
git add apps/web/hooks/use-companies.ts
git commit -m "feat(web/hooks): update useAnalyzeCompany for AnalyzeResult union, add useCompanyJobStatus"
```

---

## Task 5: AnalyzeForm 업데이트

**Files:**
- Modify: `apps/web/components/company/analyze-form.tsx`

- [ ] **Step 1: `AnalyzeForm` 전체 교체**

`apps/web/components/company/analyze-form.tsx` 전체를 아래로 교체:

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Building2, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAnalyzeCompany, useCompanies, useCompanyJobStatus } from '@/hooks/use-companies';
import { analyzeCompanySchema, type AnalyzeCompanyInput, type CompanyDto } from '@2chi/shared';

export function AnalyzeForm() {
  const router = useRouter();
  const analyze = useAnalyzeCompany();
  const { data: allCompanies } = useCompanies();

  const [nameInput, setNameInput] = useState('');
  const [debouncedName, setDebouncedName] = useState('');
  const [suggestions, setSuggestions] = useState<CompanyDto[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFromList, setSelectedFromList] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: jobStatus } = useCompanyJobStatus(pendingJobId);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AnalyzeCompanyInput>({
    resolver: zodResolver(analyzeCompanySchema),
  });

  // 분석 완료 → 기업 페이지로 이동
  useEffect(() => {
    if (jobStatus?.status === 'completed' && pendingJobId) {
      setPendingJobId(null);
      router.push('/company');
    }
  }, [jobStatus, pendingJobId, router]);

  // Debounce name input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedName(nameInput), 300);
    return () => clearTimeout(timer);
  }, [nameInput]);

  // Filter companies client-side
  useEffect(() => {
    if (!debouncedName.trim() || !allCompanies) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const lower = debouncedName.toLowerCase();
    const matched = allCompanies
      .filter((c) => c.name.toLowerCase().includes(lower))
      .slice(0, 5);
    setSuggestions(matched);
    setShowSuggestions(matched.length > 0 && !selectedFromList);
  }, [debouncedName, allCompanies, selectedFromList]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectSuggestion = (company: CompanyDto) => {
    setSelectedFromList(true);
    setShowSuggestions(false);
    router.push(`/company/${company.id}`);
  };

  const handleNameChange = (value: string) => {
    setNameInput(value);
    setValue('name', value);
    setSelectedFromList(false);
  };

  const onSubmit = async (data: AnalyzeCompanyInput) => {
    const result = await analyze.mutateAsync(data);
    if (result.cached) {
      router.push(`/company/${result.company.id}`);
    } else {
      setPendingJobId(result.jobId);
    }
  };

  const isPending = analyze.isPending || !!pendingJobId;

  return (
    <div ref={containerRef}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* 기업명 */}
        <div className="space-y-1.5 relative">
          <Label htmlFor="name">기업명 *</Label>
          <Input
            id="name"
            placeholder="카카오"
            autoComplete="off"
            {...register('name')}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0 && !selectedFromList) setShowSuggestions(true);
            }}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}

          {showSuggestions && (
            <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-md shadow-md overflow-hidden">
              <p className="text-xs text-slate-400 px-3 pt-2 pb-1">기존 기업 선택</p>
              {suggestions.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => handleSelectSuggestion(company)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="flex-1 truncate text-slate-800">{company.name}</span>
                  {company.analyzedAt && (
                    <span className="text-xs text-green-600 shrink-0">분석 완료</span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                </button>
              ))}
              <div className="border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuggestions(false);
                    setSelectedFromList(true);
                  }}
                  className="w-full px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 text-left transition-colors"
                >
                  새 기업으로 분석 →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 채용공고 */}
        <div className="space-y-1.5">
          <Label htmlFor="jobPostingText">
            채용공고 텍스트{' '}
            <span className="text-slate-400 font-normal text-xs">(붙여넣기 권장 — 직무·역량·갭 분석에 활용)</span>
          </Label>
          <Textarea
            id="jobPostingText"
            rows={8}
            placeholder="채용공고 페이지 전체 내용을 붙여넣으세요. 직무 요건, 우대 사항, 지원 자격 등이 포함될수록 분석 품질이 높아집니다."
            className="resize-y text-sm"
            {...register('jobPostingText')}
          />
          {errors.jobPostingText && (
            <p className="text-xs text-red-500">{errors.jobPostingText.message}</p>
          )}
        </div>

        {/* 추가 맥락 */}
        <div className="space-y-1.5">
          <Label htmlFor="additionalContext">추가 맥락 (선택)</Label>
          <Input
            id="additionalContext"
            placeholder="특정 사업부, 팀 문화, 강조된 키워드 등"
            {...register('additionalContext')}
          />
        </div>

        {analyze.isError && (
          <p className="text-xs text-red-500">
            {analyze.error instanceof Error ? analyze.error.message : '분석에 실패했습니다.'}
          </p>
        )}

        {pendingJobId && (
          <p className="text-xs text-blue-600 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            기업과 직무를 분석하는 중입니다... 완료되면 자동으로 이동합니다.
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI 분석 중...
            </span>
          ) : (
            '기업 + 직무 분석 시작'
          )}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd apps/web && pnpm build 2>&1 | tail -10
# 타입 에러 없음
```

- [ ] **Step 3: 커밋**

```bash
git add apps/web/components/company/analyze-form.tsx
git commit -m "feat(web): AnalyzeForm — add jobPostingText textarea, remove jobTitle, add polling state"
```

---

## Task 6: 기업 상세 페이지 업데이트

**Files:**
- Modify: `apps/web/app/(dashboard)/company/[id]/page.tsx`

- [ ] **Step 1: 기업 상세 페이지 전체 교체**

`apps/web/app/(dashboard)/company/[id]/page.tsx` 전체를 아래로 교체:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { Building2, RefreshCw, Briefcase, BarChart2 } from 'lucide-react';
import { CompetencyList } from '@/components/company/competency-list';
import { AnalyzeForm } from '@/components/company/analyze-form';
import { useCompany } from '@/hooks/use-companies';
import type { CompanyJobInfo, CompetencyGapResult } from '@2chi/shared';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading } = useCompany(id);

  if (isLoading) return <div className="text-sm text-slate-500">불러오는 중...</div>;
  if (!company) return <div className="text-sm text-red-500">기업 정보를 찾을 수 없습니다.</div>;

  const jobInfo = company.jobInfo as CompanyJobInfo | null;
  const gapResult = company.gapResult as CompetencyGapResult | null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-5 h-5 text-slate-500" />
          <h1 className="text-2xl font-semibold text-slate-900">{company.name}</h1>
        </div>
        {company.analyzedAt && (
          <p className="text-xs text-slate-400">
            분석일: {new Date(company.analyzedAt).toLocaleDateString('ko-KR')}
          </p>
        )}
      </div>

      {/* 기업 공식 정보 */}
      {company.officialInfo && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900">기업 정보</h2>
          {company.officialInfo.summary && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">기업 요약</p>
              <p className="text-sm text-slate-700 leading-relaxed">{company.officialInfo.summary}</p>
            </div>
          )}
          {company.officialInfo.culture && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">조직 문화</p>
              <p className="text-sm text-slate-700 leading-relaxed">{company.officialInfo.culture}</p>
            </div>
          )}
          {company.officialInfo.products && company.officialInfo.products.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">주요 제품/서비스</p>
              <ul className="space-y-1">
                {company.officialInfo.products.map((p, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-400">•</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {company.officialInfo.recentNews && company.officialInfo.recentNews.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">최근 동향</p>
              <ul className="space-y-1">
                {company.officialInfo.recentNews.map((n, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-400">•</span>{n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 직무 분석 — 채용공고 첨부 시에만 표시 */}
      {jobInfo && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">직무 분석</h2>
            {jobInfo.jobTitle && (
              <span className="ml-auto text-sm text-slate-500 font-medium">{jobInfo.jobTitle}</span>
            )}
          </div>
          {jobInfo.jobSummary && (
            <p className="text-sm text-slate-600">{jobInfo.jobSummary}</p>
          )}
          {jobInfo.requiredCompetencies.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">필수 역량</p>
              <div className="flex flex-wrap gap-1.5">
                {jobInfo.requiredCompetencies.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {jobInfo.preferredCompetencies.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">우대 역량</p>
              <div className="flex flex-wrap gap-1.5">
                {jobInfo.preferredCompetencies.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 핵심 역량 */}
      {company.keyCompetencies.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <CompetencyList competencies={company.keyCompetencies} />
        </div>
      )}

      {/* 갭 분석 결과 — 자동 계산 */}
      {gapResult ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">역량 갭 분석</h2>
            <span className={`ml-auto text-lg font-bold ${gapResult.score >= 70 ? 'text-green-600' : gapResult.score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
              {gapResult.score}점
            </span>
          </div>
          <p className="text-sm text-slate-600">{gapResult.summary}</p>
          {gapResult.myMatched.length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">보유 역량 ✓</p>
              <div className="flex flex-wrap gap-1.5">
                {gapResult.myMatched.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {gapResult.myMissing.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">보강 필요 역량</p>
              <div className="flex flex-wrap gap-1.5">
                {gapResult.myMissing.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-500">역량 갭 분석</h2>
          </div>
          <p className="text-sm text-slate-400">
            채용공고를 포함해 재분석하면 갭 분석 결과가 자동으로 표시됩니다.
          </p>
        </div>
      )}

      {/* 재분석 */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          재분석
        </h2>
        <AnalyzeForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd apps/web && pnpm build 2>&1 | tail -10
# 타입 에러 없음
```

- [ ] **Step 3: 커밋**

```bash
git add apps/web/app/\(dashboard\)/company/\[id\]/page.tsx
git commit -m "feat(web): company detail page shows jobInfo + auto gapResult, removes manual gap section"
```

---

## 최종 검증

- [ ] **전체 빌드**

```bash
cd /Users/sungjiwon/claude/2chi/.claude/worktrees/hopeful-moore-bb8174
pnpm build 2>&1 | tail -20
# 전체 패키지 빌드 에러 없음
```

- [ ] **전체 테스트**

```bash
pnpm test --no-coverage 2>&1 | tail -20
# companies.service.spec: 4개 통과 포함 전체 통과
```

- [ ] **최종 커밋 + 푸시**

```bash
git push
```
