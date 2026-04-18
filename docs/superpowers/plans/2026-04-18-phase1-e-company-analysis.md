# Phase 1-E: 기업·직무 분석 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기업 이름 입력 또는 채용공고 연결로 GPT-4o-mini 기업 분석을 시작하고, 자소서의 역량 매칭도 점수(0~100)를 계산해 표시한다.

**Architecture:** Companies 모듈 (CRUD + AI 분석) → CoverLetters 매칭도 엔드포인트로 확장. Company 분석 결과는 DB에 캐싱하여 24시간 내 재분석을 방지한다(spec 결정). 매칭도 계산은 사용자 이력의 키워드와 공고 필수역량 비교로 GPT-4o-mini가 점수를 반환한다.

**Tech Stack:** NestJS, Prisma, OpenAI SDK(GPT-4o-mini), Next.js 14, TanStack Query

**Prerequisite:** Plan A + Plan B + Plan C 완료 필요.

---

## 파일 구조

```
packages/shared/src/
  types/company.ts
  schemas/company.schema.ts
  (index.ts에 re-export 추가)

apps/api/src/
  ai/prompts/
    company.prompt.ts
    matching.prompt.ts
  companies/
    companies.module.ts
    companies.controller.ts
    companies.service.ts
    dto/
      create-company.dto.ts
      analyze-company.dto.ts
  cover-letters/
    cover-letters.controller.ts   (matching 엔드포인트 추가)
    cover-letters.service.ts      (calculateMatching 메서드 추가)
  app.module.ts                   (CompaniesModule 추가)

apps/api/test/
  companies.e2e-spec.ts

apps/web/
  app/company/
    page.tsx              # 기업 목록
    [id]/page.tsx         # 기업 분석 상세
  components/company/
    company-card.tsx
    analyze-form.tsx
    competency-list.tsx
  components/cover-letter/
    matching-score-badge.tsx  (자소서 매칭도 뱃지)
  hooks/
    use-companies.ts
```

---

### Task 1: 공유 Company 타입 추가

**Files:**
- Create: `packages/shared/src/types/company.ts`
- Create: `packages/shared/src/schemas/company.schema.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: company 타입 작성**

`packages/shared/src/types/company.ts`:
```typescript
export interface CompanyOfficialInfo {
  summary: string;
  products: string[];
  recentNews: string[];
}

export interface CompanyDto {
  id: string;
  userId: string;
  name: string;
  industry: string | null;
  officialInfo: CompanyOfficialInfo | null;
  unofficialInfo: Record<string, unknown> | null;
  keyCompetencies: string[];
  analyzedAt: string | null;
  createdAt: string;
}

export interface MatchingScoreDto {
  score: number;                      // 0~100
  matchedKeywords: string[];          // 매칭된 역량 키워드
  missingKeywords: string[];          // 부족한 역량 키워드
  summary: string;                    // 한 줄 요약
}
```

- [ ] **Step 2: company Zod 스키마 작성**

`packages/shared/src/schemas/company.schema.ts`:
```typescript
import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(1, '기업명을 입력하세요.').max(100),
  industry: z.string().max(50).optional(),
});

export const analyzeCompanySchema = z.object({
  name: z.string().min(1, '기업명을 입력하세요.').max(100),
  jobTitle: z.string().max(100).optional(),
  additionalContext: z.string().max(1000).optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type AnalyzeCompanyInput = z.infer<typeof analyzeCompanySchema>;
```

- [ ] **Step 3: index.ts에 re-export 추가**

`packages/shared/src/index.ts`에 추가:
```typescript
export * from './types/company';
export * from './schemas/company.schema';
```

- [ ] **Step 4: 타입 체크**

```bash
cd packages/shared && pnpm build
```

Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/types/company.ts packages/shared/src/schemas/company.schema.ts packages/shared/src/index.ts
git commit -m "feat(shared): add Company types and schemas"
```

---

### Task 2: AI 프롬프트 (기업 분석 + 역량 매칭도)

**Files:**
- Create: `apps/api/src/ai/prompts/company.prompt.ts`
- Create: `apps/api/src/ai/prompts/matching.prompt.ts`

- [ ] **Step 1: 기업 분석 프롬프트**

`apps/api/src/ai/prompts/company.prompt.ts`:
```typescript
export function buildCompanyAnalysisPrompt(
  companyName: string,
  jobTitle?: string,
  additionalContext?: string,
): string {
  return `당신은 취업 정보 분석가입니다. 아래 기업과 직무에 대해 분석하세요.

기업명: ${companyName}
${jobTitle ? `지원 직무: ${jobTitle}` : ''}
${additionalContext ? `추가 정보:\n${additionalContext}` : ''}

다음 JSON 형식으로 반환하세요:
{
  "summary": "기업 한 줄 요약 (사업 모델, 규모, 특징)",
  "products": ["주요 제품/서비스1", "주요 제품/서비스2"],
  "recentNews": ["최근 이슈/동향1", "최근 이슈/동향2"],
  "keyCompetencies": ["필요 역량1", "필요 역량2", "필요 역량3", "필요 역량4", "필요 역량5"],
  "culture": "기업 문화 한 줄 설명 (없으면 null)"
}

주의사항:
- 한국어로 작성
- keyCompetencies는 이 기업·직무에서 실제로 중요시하는 역량을 5~8개
- 확실하지 않은 정보는 포함하지 말 것
- 학습 데이터 기준으로 알고 있는 정보만 사용`;
}
```

- [ ] **Step 2: 역량 매칭도 프롬프트**

`apps/api/src/ai/prompts/matching.prompt.ts`:
```typescript
interface ExperienceSummary {
  title: string;
  action?: string | null;
  result?: string | null;
  tags: string[];
}

export function buildMatchingPrompt(
  requiredCompetencies: string[],
  experiences: ExperienceSummary[],
): string {
  const expText = experiences
    .map(
      (e, i) =>
        `[이력 ${i + 1}] ${e.title}
행동: ${e.action || '미입력'}
결과: ${e.result || '미입력'}
태그: ${e.tags.join(', ') || '없음'}`,
    )
    .join('\n\n');

  return `당신은 취업 역량 매칭 전문가입니다. 지원자의 이력이 직무 필수역량과 얼마나 일치하는지 평가하세요.

필수 역량:
${requiredCompetencies.join(', ')}

지원자 이력:
${expText || '(이력 없음)'}

다음 JSON 형식으로 반환하세요:
{
  "score": 0~100 사이의 정수,
  "matchedKeywords": ["매칭된 역량1", "매칭된 역량2"],
  "missingKeywords": ["부족한 역량1", "부족한 역량2"],
  "summary": "매칭도 평가 한 줄 요약"
}

평가 기준:
- score: 필수역량 중 이력에서 증명된 역량의 비율 (0~100)
- matchedKeywords: 이력에서 확인 가능한 역량
- missingKeywords: 이력에 없거나 약한 역량
- summary: "~역량이 강점이나 ~역량 보강 필요" 형태로 한 문장`;
}
```

- [ ] **Step 3: AiService에 기업 분석 + 매칭도 메서드 추가**

`apps/api/src/ai/ai.service.ts`에 다음 import 추가:
```typescript
import { buildCompanyAnalysisPrompt } from './prompts/company.prompt';
import { buildMatchingPrompt } from './prompts/matching.prompt';
```

그리고 클래스 내부에 메서드 추가:
```typescript
async analyzeCompany(
  companyName: string,
  jobTitle?: string,
  additionalContext?: string,
): Promise<{
  summary: string;
  products: string[];
  recentNews: string[];
  keyCompetencies: string[];
  culture: string | null;
}> {
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: buildCompanyAnalysisPrompt(companyName, jobTitle, additionalContext) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });
  const content = response.choices[0].message.content;
  if (!content) throw new Error('AI 응답이 없습니다.');
  return JSON.parse(content);
}

async calculateMatchingScore(
  requiredCompetencies: string[],
  experiences: Array<{
    title: string;
    action?: string | null;
    result?: string | null;
    tags: string[];
  }>,
): Promise<{ score: number; matchedKeywords: string[]; missingKeywords: string[]; summary: string }> {
  if (!requiredCompetencies.length) {
    return { score: 0, matchedKeywords: [], missingKeywords: [], summary: '역량 정보가 없습니다.' };
  }
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: buildMatchingPrompt(requiredCompetencies, experiences) }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });
  const content = response.choices[0].message.content;
  if (!content) throw new Error('AI 응답이 없습니다.');
  return JSON.parse(content);
}
```

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/ai/prompts/company.prompt.ts apps/api/src/ai/prompts/matching.prompt.ts apps/api/src/ai/ai.service.ts
git commit -m "feat(api): add company analysis and matching score AI prompts"
```

---

### Task 3: Companies API (CRUD + AI 분석)

**Files:**
- Create: `apps/api/src/companies/dto/create-company.dto.ts`
- Create: `apps/api/src/companies/dto/analyze-company.dto.ts`
- Create: `apps/api/src/companies/companies.service.ts`
- Create: `apps/api/src/companies/companies.controller.ts`
- Create: `apps/api/src/companies/companies.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: 실패 테스트 작성**

`apps/api/test/companies.e2e-spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Companies (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let companyId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = moduleRef.get(PrismaService);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'e2e-company@example.com', password: 'password123', name: '기업테스터', jobType: 'NEW_GRAD' });
    accessToken = res.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'e2e-company@example.com' } });
    await app.close();
  });

  describe('GET /companies', () => {
    it('should return empty list initially', async () => {
      const res = await request(app.getHttpServer())
        .get('/companies')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /companies/analyze', () => {
    it('should analyze company and return result', async () => {
      const res = await request(app.getHttpServer())
        .post('/companies/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '카카오', jobTitle: '프론트엔드 개발자' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('카카오');
      expect(Array.isArray(res.body.data.keyCompetencies)).toBe(true);
      expect(res.body.data.analyzedAt).toBeDefined();
      companyId = res.body.data.id;
    });

    it('should reuse cached result within 24h', async () => {
      const res = await request(app.getHttpServer())
        .post('/companies/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '카카오', jobTitle: '프론트엔드 개발자' })
        .expect(201);

      // 같은 ID여야 함 (캐시 재사용)
      expect(res.body.data.id).toBe(companyId);
    });
  });

  describe('GET /companies/:id', () => {
    it('should return company analysis', async () => {
      const res = await request(app.getHttpServer())
        .get(`/companies/${companyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(companyId);
      expect(res.body.data.keyCompetencies.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/companies.e2e-spec.ts --no-coverage 2>&1 | tail -5
```

Expected: `Cannot GET /companies` 또는 모듈 없음으로 실패.

- [ ] **Step 3: Company DTOs 구현**

`apps/api/src/companies/dto/create-company.dto.ts`:
```typescript
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  industry?: string;
}
```

`apps/api/src/companies/dto/analyze-company.dto.ts`:
```typescript
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class AnalyzeCompanyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalContext?: string;
}
```

- [ ] **Step 4: CompaniesService 구현**

`apps/api/src/companies/companies.service.ts`:
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { AnalyzeCompanyDto } from './dto/analyze-company.dto';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
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

  async analyzeAndUpsert(userId: string, dto: AnalyzeCompanyDto) {
    // 24시간 내 같은 기업 분석 결과 재사용
    const existing = await this.prisma.company.findFirst({
      where: { userId, name: dto.name },
    });

    if (existing?.analyzedAt) {
      const age = Date.now() - new Date(existing.analyzedAt).getTime();
      if (age < CACHE_TTL_MS) return existing;
    }

    const analysis = await this.aiService.analyzeCompany(
      dto.name,
      dto.jobTitle,
      dto.additionalContext,
    );

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
        industry: dto.jobTitle,
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
```

`apps/api/src/companies/companies.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { AnalyzeCompanyDto } from './dto/analyze-company.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('companies')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.companiesService.findAll(user.sub);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.companiesService.findOne(id, user.sub);
    return { success: true, data };
  }

  @Post('analyze')
  async analyze(@Body() dto: AnalyzeCompanyDto, @CurrentUser() user: JwtPayload) {
    const data = await this.companiesService.analyzeAndUpsert(user.sub, dto);
    return { success: true, data };
  }
}
```

`apps/api/src/companies/companies.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [CompaniesService],
  controllers: [CompaniesController],
  exports: [CompaniesService],
})
export class CompaniesModule {}
```

- [ ] **Step 5: app.module.ts에 CompaniesModule 추가**

`apps/api/src/app.module.ts`:
```typescript
import { CompaniesModule } from './companies/companies.module';
// imports 배열에 추가:
CompaniesModule,
```

- [ ] **Step 6: 테스트 실행 (통과 확인)**

**주의:** 이 테스트는 실제 OpenAI API를 호출하므로 `.env`에 유효한 `OPENAI_API_KEY`가 필요하다.

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/companies.e2e-spec.ts --no-coverage
```

Expected: `3 passed` (list, analyze, get).

- [ ] **Step 7: 커밋**

```bash
git add apps/api/src/companies apps/api/src/app.module.ts apps/api/test/companies.e2e-spec.ts
git commit -m "feat(api): add Companies module with AI analysis and 24h caching"
```

---

### Task 4: 역량 매칭도 엔드포인트 (CoverLetters 확장)

**Files:**
- Modify: `apps/api/src/cover-letters/cover-letters.service.ts`
- Modify: `apps/api/src/cover-letters/cover-letters.controller.ts`
- Modify: `apps/api/src/cover-letters/cover-letters.module.ts`

- [ ] **Step 1: CoverLettersService에 calculateMatching 추가**

`apps/api/src/cover-letters/cover-letters.service.ts`에 다음 추가:

constructor 파라미터에 ExperiencesService 이미 있음. 아래 메서드를 클래스에 추가:

```typescript
async calculateMatching(coverLetterId: string, userId: string) {
  const coverLetter = await this.findOne(coverLetterId, userId);
  const requiredCompetencies = coverLetter.jobPosting?.requiredCompetencies ?? [];

  if (!requiredCompetencies.length) {
    return { score: 0, matchedKeywords: [], missingKeywords: [], summary: '채용공고 역량 정보가 없습니다.' };
  }

  const experiences = await this.experiencesService.findAll(userId);
  const expData = experiences.map((e) => ({
    title: e.title,
    action: e.action,
    result: e.result,
    tags: e.tags.map(({ tag }: any) => tag.name),
  }));

  const result = await this.aiService.calculateMatchingScore(requiredCompetencies, expData);

  // matchingScore DB 업데이트
  await this.prisma.coverLetter.update({
    where: { id: coverLetterId },
    data: { matchingScore: result.score },
  });

  return result;
}
```

- [ ] **Step 2: CoverLettersController에 matching 엔드포인트 추가**

`apps/api/src/cover-letters/cover-letters.controller.ts`에 추가:

```typescript
@Get(':id/matching')
async calculateMatching(
  @Param('id') id: string,
  @CurrentUser() user: JwtPayload,
) {
  const data = await this.coverLettersService.calculateMatching(id, user.sub);
  return { success: true, data };
}
```

- [ ] **Step 3: CoverLettersModule에 CompaniesModule 연결 (필요 시)**

기존 `ExperiencesModule`이 이미 import되어 있으므로 추가 변경 불필요.

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/cover-letters/cover-letters.service.ts apps/api/src/cover-letters/cover-letters.controller.ts
git commit -m "feat(api): add competency matching score endpoint for cover letters"
```

---

### Task 5: Company 훅

**Files:**
- Create: `apps/web/hooks/use-companies.ts`

- [ ] **Step 1: use-companies.ts 구현**

`apps/web/hooks/use-companies.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CompanyDto, MatchingScoreDto, AnalyzeCompanyInput } from '@2chi/shared';

const CO_KEY = ['companies'] as const;

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
    mutationFn: (data: AnalyzeCompanyInput) => api.post<CompanyDto>('/companies/analyze', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CO_KEY }),
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

- [ ] **Step 2: 커밋**

```bash
git add apps/web/hooks/use-companies.ts
git commit -m "feat(web): add company and matching score query hooks"
```

---

### Task 6: Company UI (기업 목록 + 분석 상세)

**Files:**
- Create: `apps/web/components/company/company-card.tsx`
- Create: `apps/web/components/company/analyze-form.tsx`
- Create: `apps/web/components/company/competency-list.tsx`
- Create: `apps/web/components/cover-letter/matching-score-badge.tsx`
- Create: `apps/web/app/company/page.tsx`
- Create: `apps/web/app/company/[id]/page.tsx`

- [ ] **Step 1: CompanyCard 구현**

`apps/web/components/company/company-card.tsx`:
```typescript
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import type { CompanyDto } from '@2chi/shared';

export function CompanyCard({ company }: { company: CompanyDto }) {
  const isAnalyzed = !!company.analyzedAt;

  return (
    <Link href={`/company/${company.id}`}>
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 rounded-md">
            <Building2 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-slate-900">{company.name}</h3>
            {company.industry && (
              <p className="text-xs text-slate-500 mt-0.5">{company.industry}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                isAnalyzed ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {isAnalyzed ? '분석 완료' : '미분석'}
              </span>
              {company.keyCompetencies.length > 0 && (
                <span className="text-xs text-slate-400">
                  역량 {company.keyCompetencies.length}개
                </span>
              )}
            </div>
          </div>
        </div>
        {company.keyCompetencies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {company.keyCompetencies.slice(0, 4).map((c, i) => (
              <span key={i} className="rounded-md bg-blue-50 text-blue-700 text-xs px-2 py-0.5">
                {c}
              </span>
            ))}
            {company.keyCompetencies.length > 4 && (
              <span className="text-xs text-slate-400 self-center">
                +{company.keyCompetencies.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: AnalyzeForm 구현**

`apps/web/components/company/analyze-form.tsx`:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnalyzeCompany } from '@/hooks/use-companies';
import { analyzeCompanySchema, type AnalyzeCompanyInput, type CompanyDto } from '@2chi/shared';

interface Props {
  onAnalyzed: (company: CompanyDto) => void;
}

export function AnalyzeForm({ onAnalyzed }: Props) {
  const analyze = useAnalyzeCompany();
  const { register, handleSubmit, formState: { errors } } = useForm<AnalyzeCompanyInput>({
    resolver: zodResolver(analyzeCompanySchema),
  });

  const onSubmit = async (data: AnalyzeCompanyInput) => {
    const res = await analyze.mutateAsync(data);
    if (res.success) onAnalyzed(res.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">기업명</Label>
          <Input id="name" placeholder="카카오" {...register('name')} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jobTitle">지원 직무 (선택)</Label>
          <Input id="jobTitle" placeholder="프론트엔드 개발자" {...register('jobTitle')} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="additionalContext">추가 맥락 (선택)</Label>
        <Input
          id="additionalContext"
          placeholder="채용공고에서 특별히 강조한 내용, 사업부 정보 등"
          {...register('additionalContext')}
        />
      </div>
      {analyze.data && !analyze.data.success && (
        <p className="text-xs text-red-500">{analyze.data.error.message}</p>
      )}
      <Button type="submit" disabled={analyze.isPending}>
        {analyze.isPending ? 'AI 분석 중...' : '기업 분석 시작'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: CompetencyList 구현**

`apps/web/components/company/competency-list.tsx`:
```typescript
interface Props {
  competencies: string[];
  title?: string;
}

export function CompetencyList({ competencies, title = '핵심 역량' }: Props) {
  if (!competencies.length) return null;

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {competencies.map((c, i) => (
          <span key={i} className="rounded-md bg-blue-50 text-blue-700 text-sm px-3 py-1">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: MatchingScoreBadge 구현**

`apps/web/components/cover-letter/matching-score-badge.tsx`:
```typescript
'use client';

import { useMatchingScore } from '@/hooks/use-companies';
import { cn } from '@/lib/utils';

interface Props {
  coverLetterId: string;
  currentScore: number | null;
}

export function MatchingScoreBadge({ coverLetterId, currentScore }: Props) {
  const calculateScore = useMatchingScore(coverLetterId);

  const scoreColor =
    currentScore === null ? 'text-slate-400 bg-slate-100' :
    currentScore >= 70 ? 'text-green-700 bg-green-50' :
    currentScore >= 40 ? 'text-amber-700 bg-amber-50' : 'text-red-600 bg-red-50';

  return (
    <div className="flex items-center gap-2">
      {currentScore !== null && (
        <span className={cn('rounded-full text-xs font-medium px-2.5 py-0.5', scoreColor)}>
          매칭도 {currentScore}%
        </span>
      )}
      <button
        type="button"
        onClick={() => calculateScore.mutate()}
        disabled={calculateScore.isPending}
        className="text-xs text-blue-600 hover:underline disabled:text-slate-400"
      >
        {calculateScore.isPending ? '계산 중...' : currentScore === null ? '매칭도 계산' : '재계산'}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: 기업 목록 페이지 구현**

`apps/web/app/company/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { CompanyCard } from '@/components/company/company-card';
import { AnalyzeForm } from '@/components/company/analyze-form';
import { useCompanies } from '@/hooks/use-companies';
import type { CompanyDto } from '@2chi/shared';

export default function CompanyListPage() {
  const { data: companies, isLoading } = useCompanies();
  const [latestAnalyzed, setLatestAnalyzed] = useState<CompanyDto | null>(null);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">기업·직무 분석</h1>
        <p className="text-sm text-slate-500 mt-0.5">기업을 분석하고 필요 역량을 파악하세요.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">새 기업 분석</h2>
        <AnalyzeForm onAnalyzed={setLatestAnalyzed} />
        {latestAnalyzed && (
          <div className="mt-4 p-3 bg-green-50 rounded-md text-sm text-green-700">
            <span className="font-medium">{latestAnalyzed.name}</span> 분석 완료.{' '}
            <a href={`/company/${latestAnalyzed.id}`} className="underline">
              결과 보기 →
            </a>
          </div>
        )}
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {companies?.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">분석한 기업이 없습니다.</p>
          <p className="text-xs mt-1">위에서 기업명을 입력해 분석을 시작하세요.</p>
        </div>
      )}

      <div className="grid gap-3">
        {companies?.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 기업 분석 상세 페이지 구현**

`apps/web/app/company/[id]/page.tsx`:
```typescript
'use client';

import { useParams } from 'next/navigation';
import { Building2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompetencyList } from '@/components/company/competency-list';
import { AnalyzeForm } from '@/components/company/analyze-form';
import { useCompany } from '@/hooks/use-companies';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading, refetch } = useCompany(id);

  if (isLoading) return <div className="text-sm text-slate-500">불러오는 중...</div>;
  if (!company) return <div className="text-sm text-red-500">기업 정보를 찾을 수 없습니다.</div>;

  const officialInfo = company.officialInfo as {
    summary?: string;
    products?: string[];
    recentNews?: string[];
  } | null;

  return (
    <div className="max-w-3xl space-y-6">
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

      {officialInfo && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          {officialInfo.summary && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">기업 요약</p>
              <p className="text-sm text-slate-700 leading-relaxed">{officialInfo.summary}</p>
            </div>
          )}
          {officialInfo.products && officialInfo.products.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">주요 제품/서비스</p>
              <ul className="space-y-1">
                {officialInfo.products.map((p, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-400">•</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {officialInfo.recentNews && officialInfo.recentNews.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">최근 동향</p>
              <ul className="space-y-1">
                {officialInfo.recentNews.map((n, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-400">•</span>{n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {company.keyCompetencies.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <CompetencyList competencies={company.keyCompetencies} />
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          재분석
        </h2>
        <AnalyzeForm onAnalyzed={() => refetch()} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 사이드바에 기업 분석 메뉴 추가**

`apps/web/components/shared/sidebar.tsx`의 `NAV_ITEMS`에 추가:

```typescript
import { Building2 } from 'lucide-react';

// NAV_ITEMS 배열에 추가 (cover-letter 다음):
{ href: '/company', label: '기업 분석', icon: Building2 },
```

- [ ] **Step 8: 개발 서버에서 전체 플로우 확인**

```bash
pnpm dev
```

확인 시나리오:
1. `/company` → "새 기업 분석" 폼 → 기업명 입력 → "기업 분석 시작"
2. 분석 완료 → "결과 보기" → 상세 페이지
3. 핵심 역량 목록 확인
4. `/cover-letter/:id` → "매칭도 계산" 버튼 → 점수 표시

- [ ] **Step 9: 커밋**

```bash
git add apps/web/app/company apps/web/components/company apps/web/components/cover-letter/matching-score-badge.tsx apps/web/hooks/use-companies.ts apps/web/components/shared/sidebar.tsx
git commit -m "feat(web): add company analysis and matching score UI"
```

---

### Task 7: Plan E 검증 (별도 에이전트)

**IMPORTANT:** 이 Task는 반드시 Plan E 구현에 참여하지 않은 **별도의 코드 리뷰어 에이전트**가 수행한다.

- [ ] **Step 1: 코드 리뷰어 에이전트 호출**

`superpowers:requesting-code-review` 스킬을 invoke하고 아래 내용으로 리뷰 요청:

```
검토 대상:
- apps/api/src/companies/
- apps/api/src/ai/prompts/company.prompt.ts
- apps/api/src/ai/prompts/matching.prompt.ts
- apps/web/app/company/
- apps/web/components/company/
- apps/web/components/cover-letter/matching-score-badge.tsx

체크리스트:
- CLAUDE.md CRITICAL 규칙 준수 (Bull 큐 미사용 여부 — 기업 분석은 단발성이므로 동기 처리 허용인지 확인)
- packages/shared 타입 사용 여부 (CompanyDto, AnalyzeCompanyInput 등)
- API 응답 형식 일관성 ({ success, data })
- 24시간 캐시 로직 정확성
- 에러 핸들링 (OpenAI API 실패 시 처리)
- 불필요한 any 타입
- E2E 테스트 커버리지
```

- [ ] **Step 2: API 전체 테스트**

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json --no-coverage
```

Expected: auth, experiences, cover-letters, applications, companies 모두 통과.

- [ ] **Step 3: 최종 커밋**

```bash
git commit -m "feat: complete Phase 1 MVP including company analysis and matching score"
```

---

## Self-Review

### Spec Coverage 체크

| Phase 1-E 요구사항 | 구현 태스크 |
|---|---|
| 기업 이름으로 AI 분석 시작 | Task 3 (analyzeAndUpsert) |
| GPT-4o-mini로 역량 추출 | Task 2 (company.prompt) |
| 기업 분석 24h 캐싱 | Task 3 (CACHE_TTL_MS) |
| 역량 매칭도 점수(0~100) | Task 2 (matching.prompt), Task 4 |
| 공유 타입 | Task 1 |
| E2E 테스트 | Task 3 |
| 기업 목록 UI | Task 6 |
| 기업 분석 상세 UI | Task 6 |
| 매칭도 뱃지 (자소서) | Task 6 (matching-score-badge) |
| 검증: 별도 에이전트 수행 | Task 7 |

### 미포함 (Phase 2로 이동)
- 역량 매칭도 시각화 (차트, 레이더 그래프) → Phase 2에서 구현

### Placeholder 검사
없음.

### 타입 일관성
- `company.officialInfo`는 Prisma에서 `Json?`이므로 프론트에서 타입 캐스팅(`as { summary?: string; ... }`) 필요 — 상세 페이지에 반영됨
- `MatchingScoreDto` → packages/shared에서 정의, 프론트/백 공유
- `CACHE_TTL_MS` = 24시간 — spec의 "24h 이내 재사용" 요구사항과 일치
