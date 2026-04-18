# Phase 1-C: 자소서 작성 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채용공고 텍스트 붙여넣기 → 공고 파싱(AI) → **자소서 항목(질문 + 글자수) 입력** → AI 초안 생성(SSE 스트리밍) → 편집 → AI 피드백 기능을 API와 UI 모두 완성한다.

**Architecture:** JobPostings(공고 파싱) → CoverLetters(자소서 CRUD) → CoverLetterItems(항목별 초안/피드백) 순서로 구현. **자소서는 항목(질문 + 글자수 제한)이 1개 이상 등록된 후에만 AI 초안 생성 가능**. 항목 추가·삭제는 자유롭게. AI 초안은 SSE 스트리밍(NestJS SSE). 피드백은 동기 JSON 응답(GPT-4o).

**Tech Stack:** NestJS, Prisma, Bull, OpenAI SDK(GPT-4o/GPT-4o-mini), SSE, Next.js 14, Vercel AI SDK `useCompletion`, TanStack Query

**Prerequisite:** Plan A + Plan B 완료 필요. Plan E(기업·직무 분석) 이전에 완료 권장.

---

## 파일 구조

```
packages/shared/src/
  types/cover-letter.ts
  schemas/cover-letter.schema.ts
  (index.ts에 re-export 추가)

apps/api/src/
  ai/prompts/
    job-posting.prompt.ts
    cover-letter.prompt.ts
    feedback.prompt.ts
  job-postings/
    job-postings.module.ts
    job-postings.controller.ts
    job-postings.service.ts
    dto/parse-job-posting.dto.ts
  cover-letters/
    cover-letters.module.ts
    cover-letters.controller.ts
    cover-letters.service.ts
    dto/
      create-cover-letter.dto.ts
      update-cover-letter.dto.ts
      add-item.dto.ts
      update-item.dto.ts
  app.module.ts   (JobPostingsModule, CoverLettersModule 추가)

apps/api/test/
  cover-letters.e2e-spec.ts

apps/web/
  app/cover-letter/
    page.tsx                 # 자소서 목록
    new/page.tsx             # 자소서 생성 (공고 입력)
    [id]/page.tsx            # 자소서 편집 메인
  components/cover-letter/
    cover-letter-card.tsx
    job-posting-input.tsx    # 공고 텍스트 입력 + AI 파싱
    cover-letter-editor.tsx  # 항목 목록 + 편집
    item-editor.tsx          # 단일 항목 편집 + AI 초안
    feedback-panel.tsx       # AI 피드백 표시
  hooks/
    use-cover-letters.ts
    use-job-postings.ts
```

---

### Task 1: 공유 CoverLetter 타입 추가

**Files:**
- Create: `packages/shared/src/types/cover-letter.ts`
- Create: `packages/shared/src/schemas/cover-letter.schema.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: cover-letter 타입 작성**

`packages/shared/src/types/cover-letter.ts`:
```typescript
export type CoverLetterStatus = 'DRAFT' | 'EDITING' | 'DONE';

export interface JobPostingDto {
  id: string;
  userId: string;
  companyId: string | null;
  url: string | null;
  title: string;
  department: string | null;
  deadline: string | null;
  requiredCompetencies: string[];
  preferredCompetencies: string[];
  requirements: string | null;
  rawText: string | null;
  parsedAt: string | null;
  createdAt: string;
}

export interface CoverLetterItemFeedback {
  score: number;
  awkwardPhrases: string[];
  suggestions: string[];
  missingKeywords: string[];
}

export interface CoverLetterItemDto {
  id: string;
  coverLetterId: string;
  question: string;
  order: number;
  charLimit: number | null;
  aiDraft: string | null;
  userContent: string | null;
  feedback: CoverLetterItemFeedback | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoverLetterDto {
  id: string;
  userId: string;
  jobPostingId: string | null;
  companyId: string | null;
  title: string;
  matchingScore: number | null;
  status: CoverLetterStatus;
  items: CoverLetterItemDto[];
  jobPosting: JobPostingDto | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: cover-letter Zod 스키마 작성**

`packages/shared/src/schemas/cover-letter.schema.ts`:
```typescript
import { z } from 'zod';

export const parseJobPostingSchema = z.object({
  text: z.string().min(10, '공고 내용을 입력하세요.'),
  url: z.string().url().optional(),
});

export const createCoverLetterSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(100),
  jobPostingId: z.string().optional(),
  companyId: z.string().optional(),
});

export const addCoverLetterItemSchema = z.object({
  question: z.string().min(1, '항목 질문을 입력하세요.'),
  order: z.number().int().min(0),
  charLimit: z.number().int().min(100).max(5000).optional(),
});

export const updateCoverLetterItemSchema = z.object({
  userContent: z.string().optional(),
  question: z.string().optional(),
  charLimit: z.number().int().optional(),
});

export type ParseJobPostingInput = z.infer<typeof parseJobPostingSchema>;
export type CreateCoverLetterInput = z.infer<typeof createCoverLetterSchema>;
export type AddCoverLetterItemInput = z.infer<typeof addCoverLetterItemSchema>;
export type UpdateCoverLetterItemInput = z.infer<typeof updateCoverLetterItemSchema>;
```

- [ ] **Step 3: index.ts에 re-export 추가**

`packages/shared/src/index.ts`에 추가:
```typescript
export * from './types/cover-letter';
export * from './schemas/cover-letter.schema';
```

- [ ] **Step 4: 타입 체크**

```bash
cd packages/shared && pnpm build
```

Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/types/cover-letter.ts packages/shared/src/schemas/cover-letter.schema.ts packages/shared/src/index.ts
git commit -m "feat(shared): add CoverLetter and JobPosting types and schemas"
```

---

### Task 2: AI 프롬프트 추가 (공고 파싱, 자소서 초안, 피드백)

**Files:**
- Create: `apps/api/src/ai/prompts/job-posting.prompt.ts`
- Create: `apps/api/src/ai/prompts/cover-letter.prompt.ts`
- Create: `apps/api/src/ai/prompts/feedback.prompt.ts`

- [ ] **Step 1: 공고 파싱 프롬프트**

`apps/api/src/ai/prompts/job-posting.prompt.ts`:
```typescript
export function buildJobPostingParsePrompt(text: string): string {
  return `아래 채용공고 텍스트를 분석하여 구조화된 JSON으로 반환하세요.

채용공고 텍스트:
${text}

다음 JSON 형식으로 반환하세요:
{
  "title": "직무명",
  "department": "부서명 (없으면 null)",
  "companyName": "회사명 (없으면 null)",
  "deadline": "마감일 YYYY-MM-DD (없으면 null)",
  "requiredCompetencies": ["필수 역량1", "필수 역량2"],
  "preferredCompetencies": ["우대 역량1", "우대 역량2"],
  "requirements": "자격 요건 원문 (없으면 null)"
}

주의:
- 한국어로 작성
- 확실하지 않은 정보는 null 또는 빈 배열
- requiredCompetencies와 preferredCompetencies는 역량 키워드 중심으로 5개 이내`;
}
```

- [ ] **Step 2: 자소서 초안 프롬프트**

`apps/api/src/ai/prompts/cover-letter.prompt.ts`:
```typescript
interface StarExperience {
  title: string;
  situation?: string | null;
  task?: string | null;
  action?: string | null;
  result?: string | null;
  resultMetric?: string | null;
}

interface JobContext {
  title: string;
  requiredCompetencies: string[];
}

export function buildCoverLetterDraftPrompt(
  question: string,
  charLimit: number | null,
  experiences: StarExperience[],
  jobContext: JobContext | null,
): string {
  const experiencePart = experiences
    .map(
      (e, i) => `[이력 ${i + 1}] ${e.title}
상황: ${e.situation || '미입력'}
과제: ${e.task || '미입력'}
행동: ${e.action || '미입력'}
결과: ${e.result || '미입력'}${e.resultMetric ? `\n수치: ${e.resultMetric}` : ''}`,
    )
    .join('\n\n');

  const jobPart = jobContext
    ? `직무: ${jobContext.title}\n필수역량: ${jobContext.requiredCompetencies.join(', ')}`
    : '';

  const limitPart = charLimit ? `\n글자 수 제한: ${charLimit}자 이내로 작성하세요.` : '';

  return `당신은 취업 전문 작가입니다. 아래 정보를 바탕으로 자기소개서 항목의 초안을 작성하세요.

항목 질문:
${question}

지원 직무 정보:
${jobPart || '(직무 정보 없음)'}

보유 이력:
${experiencePart || '(이력 정보 없음)'}
${limitPart}

작성 기준:
- 1인칭(저는/제가)으로 작성
- STAR 구조의 구체적 경험을 근거로 활용
- 지원 직무의 필수역량과 연결
- 진부한 표현(열정적인, 성실한 등) 최소화
- 글자 제한이 있으면 그 안에서 핵심만 담기
- 자연스러운 한국어 문어체

지금 바로 본문만 작성하세요. 설명이나 제목 없이 자기소개서 본문만.`;
}
```

- [ ] **Step 3: 피드백 프롬프트**

`apps/api/src/ai/prompts/feedback.prompt.ts`:
```typescript
export function buildFeedbackPrompt(
  question: string,
  content: string,
  requiredKeywords: string[],
): string {
  return `당신은 자기소개서 전문 컨설턴트입니다. 아래 자기소개서 항목을 평가하세요.

항목 질문:
${question}

작성 내용:
${content}

필수 키워드 (직무 역량):
${requiredKeywords.length ? requiredKeywords.join(', ') : '(없음)'}

다음 JSON 형식으로 반환하세요:
{
  "score": 0~100 사이의 점수,
  "awkwardPhrases": ["어색한 표현1", "어색한 표현2"],
  "suggestions": ["개선 제안1", "개선 제안2", "개선 제안3"],
  "missingKeywords": ["빠진 키워드1", "빠진 키워드2"]
}

평가 기준:
- score: STAR 구조 완성도(40), 직무 연관성(30), 표현력(20), 글자 효율(10)
- awkwardPhrases: 5개 이하
- suggestions: 구체적이고 실행 가능한 제안, 3개
- missingKeywords: 필수 키워드 중 내용에 없는 것`;
}
```

- [ ] **Step 4: AiService에 자소서 관련 메서드 추가**

`apps/api/src/ai/ai.service.ts`에 다음 메서드들을 추가:

```typescript
// 기존 import에 추가
import { buildJobPostingParsePrompt } from './prompts/job-posting.prompt';
import { buildCoverLetterDraftPrompt } from './prompts/cover-letter.prompt';
import { buildFeedbackPrompt } from './prompts/feedback.prompt';

// 클래스 내부에 추가
async parseJobPosting(text: string): Promise<{
  title: string;
  department: string | null;
  companyName: string | null;
  deadline: string | null;
  requiredCompetencies: string[];
  preferredCompetencies: string[];
  requirements: string | null;
}> {
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: buildJobPostingParsePrompt(text) }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });
  const content = response.choices[0].message.content;
  if (!content) throw new Error('AI 응답이 없습니다.');
  return JSON.parse(content);
}

async *streamCoverLetterDraft(
  question: string,
  charLimit: number | null,
  experiences: Array<{ title: string; situation?: string | null; task?: string | null; action?: string | null; result?: string | null; resultMetric?: string | null }>,
  jobContext: { title: string; requiredCompetencies: string[] } | null,
): AsyncGenerator<string> {
  const stream = await this.openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: buildCoverLetterDraftPrompt(question, charLimit, experiences, jobContext) }],
    stream: true,
    temperature: 0.7,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

async generateFeedback(
  question: string,
  content: string,
  requiredKeywords: string[],
): Promise<{ score: number; awkwardPhrases: string[]; suggestions: string[]; missingKeywords: string[] }> {
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: buildFeedbackPrompt(question, content, requiredKeywords) }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });
  const content_ = response.choices[0].message.content;
  if (!content_) throw new Error('AI 응답이 없습니다.');
  return JSON.parse(content_);
}
```

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/ai/prompts apps/api/src/ai/ai.service.ts
git commit -m "feat(api): add job posting parse, cover letter draft, and feedback AI prompts"
```

---

### Task 3: JobPostings API

**Files:**
- Create: `apps/api/src/job-postings/dto/parse-job-posting.dto.ts`
- Create: `apps/api/src/job-postings/job-postings.service.ts`
- Create: `apps/api/src/job-postings/job-postings.controller.ts`
- Create: `apps/api/src/job-postings/job-postings.module.ts`

- [ ] **Step 1: ParseJobPostingDto 구현**

`apps/api/src/job-postings/dto/parse-job-posting.dto.ts`:
```typescript
import { IsString, MinLength, IsOptional, IsUrl } from 'class-validator';

export class ParseJobPostingDto {
  @IsString()
  @MinLength(10, { message: '공고 내용을 입력하세요.' })
  text: string;

  @IsOptional()
  @IsUrl({}, { message: '유효한 URL을 입력하세요.' })
  url?: string;
}
```

- [ ] **Step 2: JobPostingsService 구현**

`apps/api/src/job-postings/job-postings.service.ts`:
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ParseJobPostingDto } from './dto/parse-job-posting.dto';

@Injectable()
export class JobPostingsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.jobPosting.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const posting = await this.prisma.jobPosting.findUnique({ where: { id } });
    if (!posting) throw new NotFoundException('공고를 찾을 수 없습니다.');
    if (posting.userId !== userId) throw new ForbiddenException();
    return posting;
  }

  async parseAndCreate(userId: string, dto: ParseJobPostingDto) {
    const parsed = await this.aiService.parseJobPosting(dto.text);

    let companyId: string | undefined;
    if (parsed.companyName) {
      const company = await this.prisma.company.upsert({
        where: { id: `${userId}-${parsed.companyName}` },
        update: {},
        create: { id: `${userId}-${parsed.companyName}`, userId, name: parsed.companyName },
      });
      companyId = company.id;
    }

    return this.prisma.jobPosting.create({
      data: {
        userId,
        companyId,
        url: dto.url,
        title: parsed.title,
        department: parsed.department,
        deadline: parsed.deadline ? new Date(parsed.deadline) : undefined,
        requiredCompetencies: parsed.requiredCompetencies,
        preferredCompetencies: parsed.preferredCompetencies,
        requirements: parsed.requirements,
        rawText: dto.text,
        parsedAt: new Date(),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.jobPosting.delete({ where: { id } });
  }
}
```

`apps/api/src/job-postings/job-postings.controller.ts`:
```typescript
import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { JobPostingsService } from './job-postings.service';
import { ParseJobPostingDto } from './dto/parse-job-posting.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('job-postings')
export class JobPostingsController {
  constructor(private jobPostingsService: JobPostingsService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.jobPostingsService.findAll(user.sub);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.jobPostingsService.findOne(id, user.sub);
    return { success: true, data };
  }

  @Post('parse')
  async parseAndCreate(@Body() dto: ParseJobPostingDto, @CurrentUser() user: JwtPayload) {
    const data = await this.jobPostingsService.parseAndCreate(user.sub, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.jobPostingsService.remove(id, user.sub);
    return { success: true, data: null };
  }
}
```

`apps/api/src/job-postings/job-postings.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { JobPostingsService } from './job-postings.service';
import { JobPostingsController } from './job-postings.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [JobPostingsService],
  controllers: [JobPostingsController],
  exports: [JobPostingsService],
})
export class JobPostingsModule {}
```

- [ ] **Step 3: app.module.ts에 JobPostingsModule 추가**

`apps/api/src/app.module.ts`:
```typescript
import { JobPostingsModule } from './job-postings/job-postings.module';
// imports 배열에 추가:
JobPostingsModule,
```

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/job-postings apps/api/src/app.module.ts
git commit -m "feat(api): add JobPostings module with AI parsing"
```

---

### Task 4: CoverLetters API (CRUD + SSE 스트리밍 + 피드백)

**Files:**
- Create: `apps/api/src/cover-letters/dto/` (4개 DTO 파일)
- Create: `apps/api/src/cover-letters/cover-letters.service.ts`
- Create: `apps/api/src/cover-letters/cover-letters.controller.ts`
- Create: `apps/api/src/cover-letters/cover-letters.module.ts`

- [ ] **Step 1: 실패 테스트 작성**

`apps/api/test/cover-letters.e2e-spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('CoverLetters (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let coverLetterId: string;
  let itemId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = moduleRef.get(PrismaService);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'e2e-cl@example.com', password: 'password123', name: '자소서테스터', jobType: 'NEW_GRAD' });
    accessToken = res.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'e2e-cl@example.com' } });
    await app.close();
  });

  describe('POST /cover-letters', () => {
    it('should create a cover letter', async () => {
      const res = await request(app.getHttpServer())
        .post('/cover-letters')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '카카오 자소서' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('카카오 자소서');
      expect(res.body.data.status).toBe('DRAFT');
      coverLetterId = res.body.data.id;
    });
  });

  describe('POST /cover-letters/:id/items', () => {
    it('should add an item', async () => {
      const res = await request(app.getHttpServer())
        .post(`/cover-letters/${coverLetterId}/items`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ question: '본인의 강점을 서술하세요.', order: 0, charLimit: 1000 })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.question).toBe('본인의 강점을 서술하세요.');
      itemId = res.body.data.id;
    });
  });

  describe('PATCH /cover-letters/:id/items/:itemId', () => {
    it('should update item content', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/cover-letters/${coverLetterId}/items/${itemId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userContent: '제 강점은 꼼꼼함입니다.' })
        .expect(200);

      expect(res.body.data.userContent).toBe('제 강점은 꼼꼼함입니다.');
    });
  });

  describe('GET /cover-letters', () => {
    it('should return list', async () => {
      const res = await request(app.getHttpServer())
        .get('/cover-letters')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('DELETE /cover-letters/:id', () => {
    it('should delete the cover letter', async () => {
      await request(app.getHttpServer())
        .delete(`/cover-letters/${coverLetterId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/cover-letters.e2e-spec.ts --no-coverage 2>&1 | tail -5
```

Expected: `Cannot POST /cover-letters` 등으로 실패.

- [ ] **Step 3: CoverLetter DTOs 구현**

`apps/api/src/cover-letters/dto/create-cover-letter.dto.ts`:
```typescript
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateCoverLetterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  jobPostingId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}
```

`apps/api/src/cover-letters/dto/update-cover-letter.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateCoverLetterDto } from './create-cover-letter.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateCoverLetterDto extends PartialType(CreateCoverLetterDto) {
  @IsOptional()
  @IsEnum(['DRAFT', 'EDITING', 'DONE'])
  status?: 'DRAFT' | 'EDITING' | 'DONE';
}
```

`apps/api/src/cover-letters/dto/add-item.dto.ts`:
```typescript
import { IsString, IsInt, IsOptional, Min, Max, MinLength } from 'class-validator';

export class AddItemDto {
  @IsString()
  @MinLength(1)
  question: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(5000)
  charLimit?: number;
}
```

`apps/api/src/cover-letters/dto/update-item.dto.ts`:
```typescript
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  userContent?: string;

  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  charLimit?: number;
}
```

- [ ] **Step 4: CoverLettersService 구현**

`apps/api/src/cover-letters/cover-letters.service.ts`:
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ExperiencesService } from '../experiences/experiences.service';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { UpdateCoverLetterDto } from './dto/update-cover-letter.dto';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CoverLetterStatus } from '@prisma/client';

@Injectable()
export class CoverLettersService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private experiencesService: ExperiencesService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.coverLetter.findMany({
      where: { userId },
      include: { items: { orderBy: { order: 'asc' } }, jobPosting: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const cl = await this.prisma.coverLetter.findUnique({
      where: { id },
      include: { items: { orderBy: { order: 'asc' } }, jobPosting: true },
    });
    if (!cl) throw new NotFoundException('자소서를 찾을 수 없습니다.');
    if (cl.userId !== userId) throw new ForbiddenException();
    return cl;
  }

  async create(userId: string, dto: CreateCoverLetterDto) {
    return this.prisma.coverLetter.create({
      data: { ...dto, userId, status: CoverLetterStatus.DRAFT },
      include: { items: true, jobPosting: true },
    });
  }

  async update(id: string, userId: string, dto: UpdateCoverLetterDto) {
    await this.findOne(id, userId);
    return this.prisma.coverLetter.update({
      where: { id },
      data: { ...dto, status: dto.status as CoverLetterStatus | undefined },
      include: { items: { orderBy: { order: 'asc' } }, jobPosting: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.coverLetter.delete({ where: { id } });
  }

  async addItem(coverLetterId: string, userId: string, dto: AddItemDto) {
    await this.findOne(coverLetterId, userId);
    return this.prisma.coverLetterItem.create({
      data: { coverLetterId, ...dto },
    });
  }

  async updateItem(coverLetterId: string, itemId: string, userId: string, dto: UpdateItemDto) {
    await this.findOne(coverLetterId, userId);
    const item = await this.prisma.coverLetterItem.findUnique({ where: { id: itemId } });
    if (!item || item.coverLetterId !== coverLetterId) throw new NotFoundException();
    return this.prisma.coverLetterItem.update({ where: { id: itemId }, data: dto });
  }

  async *streamDraft(
    coverLetterId: string,
    itemId: string,
    userId: string,
  ): AsyncGenerator<string> {
    const coverLetter = await this.findOne(coverLetterId, userId);
    const item = await this.prisma.coverLetterItem.findUnique({ where: { id: itemId } });
    if (!item || item.coverLetterId !== coverLetterId) throw new NotFoundException();

    const experiences = await this.experiencesService.findAll(userId);
    const jobContext = coverLetter.jobPosting
      ? { title: coverLetter.jobPosting.title, requiredCompetencies: coverLetter.jobPosting.requiredCompetencies }
      : null;

    const expData = experiences.slice(0, 5).map((e) => ({
      title: e.title,
      situation: e.situation,
      task: e.task,
      action: e.action,
      result: e.result,
      resultMetric: e.resultMetric,
    }));

    let fullText = '';
    for await (const chunk of this.aiService.streamCoverLetterDraft(
      item.question,
      item.charLimit,
      expData,
      jobContext,
    )) {
      fullText += chunk;
      yield chunk;
    }

    await this.prisma.coverLetterItem.update({
      where: { id: itemId },
      data: { aiDraft: fullText },
    });
  }

  async generateFeedback(coverLetterId: string, itemId: string, userId: string) {
    const coverLetter = await this.findOne(coverLetterId, userId);
    const item = await this.prisma.coverLetterItem.findUnique({ where: { id: itemId } });
    if (!item || item.coverLetterId !== coverLetterId) throw new NotFoundException();
    if (!item.userContent) throw new NotFoundException('작성된 내용이 없습니다.');

    const keywords = coverLetter.jobPosting?.requiredCompetencies ?? [];
    const feedback = await this.aiService.generateFeedback(item.question, item.userContent, keywords);

    return this.prisma.coverLetterItem.update({
      where: { id: itemId },
      data: { feedback },
    });
  }
}
```

- [ ] **Step 5: CoverLettersController 구현**

`apps/api/src/cover-letters/cover-letters.controller.ts`:
```typescript
import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  HttpCode, HttpStatus, Sse, MessageEvent, Res
} from '@nestjs/common';
import { Response } from 'express';
import { CoverLettersService } from './cover-letters.service';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { UpdateCoverLetterDto } from './dto/update-cover-letter.dto';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('cover-letters')
export class CoverLettersController {
  constructor(private coverLettersService: CoverLettersService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.coverLettersService.findAll(user.sub);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.coverLettersService.findOne(id, user.sub);
    return { success: true, data };
  }

  @Post()
  async create(@Body() dto: CreateCoverLetterDto, @CurrentUser() user: JwtPayload) {
    const data = await this.coverLettersService.create(user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCoverLetterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.coverLettersService.update(id, user.sub, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.coverLettersService.remove(id, user.sub);
    return { success: true, data: null };
  }

  @Post(':id/items')
  async addItem(
    @Param('id') id: string,
    @Body() dto: AddItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.coverLettersService.addItem(id, user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id/items/:itemId')
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.coverLettersService.updateItem(id, itemId, user.sub, dto);
    return { success: true, data };
  }

  @Post(':id/items/:itemId/draft')
  async streamDraft(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of this.coverLettersService.streamDraft(id, itemId, user.sub)) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: '초안 생성 중 오류가 발생했습니다.' })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post(':id/items/:itemId/feedback')
  async generateFeedback(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.coverLettersService.generateFeedback(id, itemId, user.sub);
    return { success: true, data };
  }
}
```

`apps/api/src/cover-letters/cover-letters.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CoverLettersService } from './cover-letters.service';
import { CoverLettersController } from './cover-letters.controller';
import { AiModule } from '../ai/ai.module';
import { ExperiencesModule } from '../experiences/experiences.module';

@Module({
  imports: [AiModule, ExperiencesModule],
  providers: [CoverLettersService],
  controllers: [CoverLettersController],
})
export class CoverLettersModule {}
```

- [ ] **Step 6: app.module.ts에 CoverLettersModule 추가**

`apps/api/src/app.module.ts`:
```typescript
import { CoverLettersModule } from './cover-letters/cover-letters.module';
// imports 배열에 추가:
CoverLettersModule,
```

- [ ] **Step 7: 테스트 실행 (통과 확인)**

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/cover-letters.e2e-spec.ts --no-coverage
```

Expected: `5 passed`.

- [ ] **Step 8: 커밋**

```bash
git add apps/api/src/cover-letters apps/api/src/app.module.ts apps/api/test/cover-letters.e2e-spec.ts
git commit -m "feat(api): add CoverLetters CRUD, SSE draft streaming, and AI feedback"
```

---

### Task 5: CoverLetter 훅 + API 클라이언트

**Files:**
- Create: `apps/web/hooks/use-cover-letters.ts`
- Create: `apps/web/hooks/use-job-postings.ts`

- [ ] **Step 1: use-cover-letters.ts 구현**

`apps/web/hooks/use-cover-letters.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CoverLetterDto, CoverLetterItemDto,
  CreateCoverLetterInput, AddCoverLetterItemInput, UpdateCoverLetterItemInput
} from '@2chi/shared';

const CL_KEY = ['cover-letters'] as const;

export function useCoverLetters() {
  return useQuery({
    queryKey: CL_KEY,
    queryFn: async () => {
      const res = await api.get<CoverLetterDto[]>('/cover-letters');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useCoverLetter(id: string) {
  return useQuery({
    queryKey: [...CL_KEY, id],
    queryFn: async () => {
      const res = await api.get<CoverLetterDto>(`/cover-letters/${id}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCoverLetterInput) => api.post<CoverLetterDto>('/cover-letters', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CL_KEY }),
  });
}

export function useDeleteCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cover-letters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: CL_KEY }),
  });
}

export function useAddCoverLetterItem(coverLetterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddCoverLetterItemInput) =>
      api.post<CoverLetterItemDto>(`/cover-letters/${coverLetterId}/items`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CL_KEY, coverLetterId] }),
  });
}

export function useUpdateCoverLetterItem(coverLetterId: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCoverLetterItemInput) =>
      api.patch<CoverLetterItemDto>(`/cover-letters/${coverLetterId}/items/${itemId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CL_KEY, coverLetterId] }),
  });
}

export function useGenerateFeedback(coverLetterId: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<CoverLetterItemDto>(`/cover-letters/${coverLetterId}/items/${itemId}/feedback`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CL_KEY, coverLetterId] }),
  });
}
```

- [ ] **Step 2: use-job-postings.ts 구현**

`apps/web/hooks/use-job-postings.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { JobPostingDto, ParseJobPostingInput } from '@2chi/shared';

const JP_KEY = ['job-postings'] as const;

export function useJobPostings() {
  return useQuery({
    queryKey: JP_KEY,
    queryFn: async () => {
      const res = await api.get<JobPostingDto[]>('/job-postings');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useParseJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ParseJobPostingInput) => api.post<JobPostingDto>('/job-postings/parse', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: JP_KEY }),
  });
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/web/hooks/use-cover-letters.ts apps/web/hooks/use-job-postings.ts
git commit -m "feat(web): add cover letter and job posting query hooks"
```

---

### Task 6: CoverLetter UI

**Files:**
- Create: `apps/web/components/cover-letter/cover-letter-card.tsx`
- Create: `apps/web/components/cover-letter/job-posting-input.tsx`
- Create: `apps/web/components/cover-letter/item-editor.tsx`
- Create: `apps/web/components/cover-letter/feedback-panel.tsx`
- Create: `apps/web/app/cover-letter/page.tsx`
- Create: `apps/web/app/cover-letter/new/page.tsx`
- Create: `apps/web/app/cover-letter/[id]/page.tsx`

- [ ] **Step 1: CoverLetterCard 구현**

`apps/web/components/cover-letter/cover-letter-card.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CoverLetterDto } from '@2chi/shared';

const STATUS_CONFIG = {
  DRAFT: { label: '초안', className: 'bg-slate-100 text-slate-600' },
  EDITING: { label: '작성 중', className: 'bg-blue-50 text-blue-700' },
  DONE: { label: '완료', className: 'bg-green-50 text-green-700' },
} as const;

export function CoverLetterCard({ coverLetter }: { coverLetter: CoverLetterDto }) {
  const status = STATUS_CONFIG[coverLetter.status];

  return (
    <Link href={`/cover-letter/${coverLetter.id}`}>
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn('rounded-full text-xs font-medium px-2.5 py-0.5', status.className)}>
                {status.label}
              </span>
              {coverLetter.jobPosting && (
                <span className="text-xs text-slate-500">{coverLetter.jobPosting.title}</span>
              )}
            </div>
            <h3 className="text-sm font-medium text-slate-900 truncate">{coverLetter.title}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-slate-400">항목</p>
            <p className="text-sm font-medium text-slate-700">{coverLetter.items.length}개</p>
          </div>
        </div>
        {coverLetter.matchingScore !== null && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${coverLetter.matchingScore}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">매칭도 {coverLetter.matchingScore}%</span>
          </div>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: JobPostingInput 구현**

`apps/web/components/cover-letter/job-posting-input.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useParseJobPosting } from '@/hooks/use-job-postings';
import type { JobPostingDto } from '@2chi/shared';

interface Props {
  onParsed: (jobPosting: JobPostingDto) => void;
}

export function JobPostingInput({ onParsed }: Props) {
  const [text, setText] = useState('');
  const parse = useParseJobPosting();

  const handleParse = async () => {
    if (!text.trim()) return;
    const res = await parse.mutateAsync({ text });
    if (res.success) onParsed(res.data);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          채용공고 붙여넣기 (선택)
        </label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="채용공고 전체 내용을 붙여넣으세요. AI가 직무, 필수역량, 마감일 등을 자동으로 파악합니다."
          rows={6}
          className="resize-none"
        />
      </div>
      {parse.data && !parse.data.success && (
        <p className="text-xs text-red-500">{parse.data.error.message}</p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleParse}
        disabled={parse.isPending || !text.trim()}
      >
        {parse.isPending ? '분석 중...' : '공고 분석'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: FeedbackPanel 구현**

`apps/web/components/cover-letter/feedback-panel.tsx`:
```typescript
'use client';

import type { CoverLetterItemFeedback } from '@2chi/shared';

interface Props {
  feedback: CoverLetterItemFeedback;
}

export function FeedbackPanel({ feedback }: Props) {
  const scoreColor =
    feedback.score >= 80 ? 'text-green-600' :
    feedback.score >= 60 ? 'text-amber-600' : 'text-red-500';

  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">AI 피드백</span>
        <span className={`text-lg font-semibold ${scoreColor}`}>{feedback.score}점</span>
      </div>

      {feedback.suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">개선 제안</p>
          <ul className="space-y-1">
            {feedback.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-blue-500 shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.awkwardPhrases.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">어색한 표현</p>
          <div className="flex flex-wrap gap-1.5">
            {feedback.awkwardPhrases.map((p, i) => (
              <span key={i} className="rounded-md bg-red-50 text-red-600 text-xs px-2 py-0.5">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {feedback.missingKeywords.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">빠진 키워드</p>
          <div className="flex flex-wrap gap-1.5">
            {feedback.missingKeywords.map((k, i) => (
              <span key={i} className="rounded-md bg-amber-50 text-amber-700 text-xs px-2 py-0.5">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: ItemEditor 구현 (SSE 스트리밍 포함)**

`apps/web/components/cover-letter/item-editor.tsx`:
```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FeedbackPanel } from './feedback-panel';
import { useUpdateCoverLetterItem, useGenerateFeedback } from '@/hooks/use-cover-letters';
import type { CoverLetterItemDto } from '@2chi/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  coverLetterId: string;
  item: CoverLetterItemDto;
}

export function ItemEditor({ coverLetterId, item }: Props) {
  const [content, setContent] = useState(item.userContent ?? item.aiDraft ?? '');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const updateItem = useUpdateCoverLetterItem(coverLetterId, item.id);
  const generateFeedback = useGenerateFeedback(coverLetterId, item.id);

  const handleSave = () => {
    updateItem.mutate({ userContent: content });
  };

  const handleGenerateDraft = async () => {
    setIsStreaming(true);
    setContent('');

    const token = (() => {
      try {
        const stored = localStorage.getItem('2chi-auth');
        return stored ? JSON.parse(stored)?.state?.accessToken : null;
      } catch { return null; }
    })();

    const res = await fetch(
      `${API_BASE}/cover-letters/${coverLetterId}/items/${item.id}/draft`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) { setIsStreaming(false); return; }

    let accumulated = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') { setIsStreaming(false); break; }
        try {
          const parsed = JSON.parse(raw);
          if (parsed.text) {
            accumulated += parsed.text;
            setContent(accumulated);
          }
        } catch { /* 파싱 실패 무시 */ }
      }
    }

    setIsStreaming(false);
  };

  const charCount = content.length;
  const isOverLimit = item.charLimit ? charCount > item.charLimit : false;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">{item.question}</p>
        {item.charLimit && (
          <span className={`text-xs shrink-0 ${isOverLimit ? 'text-red-500' : 'text-slate-400'}`}>
            {charCount}/{item.charLimit}자
          </span>
        )}
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 작성하거나 AI 초안을 생성하세요."
        rows={8}
        className="resize-none leading-relaxed text-base text-slate-800"
        disabled={isStreaming}
      />

      {isStreaming && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="animate-pulse">|</span>
          AI가 초안을 작성하고 있습니다...
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerateDraft}
          disabled={isStreaming}
          className="flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI 초안 생성
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={updateItem.isPending || isOverLimit}
        >
          {updateItem.isPending ? '저장 중...' : '저장'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            generateFeedback.mutate();
            setShowFeedback(true);
          }}
          disabled={generateFeedback.isPending || !content.trim()}
          className="flex items-center gap-1.5 ml-auto"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {generateFeedback.isPending ? '피드백 생성 중...' : 'AI 피드백'}
        </Button>
      </div>

      {item.feedback && showFeedback && (
        <FeedbackPanel feedback={item.feedback as any} />
      )}
    </div>
  );
}
```

- [ ] **Step 5: 자소서 목록 페이지 구현**

`apps/web/app/cover-letter/page.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CoverLetterCard } from '@/components/cover-letter/cover-letter-card';
import { useCoverLetters } from '@/hooks/use-cover-letters';

export default function CoverLetterListPage() {
  const { data: coverLetters, isLoading } = useCoverLetters();

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">자소서</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI가 내 이력을 바탕으로 초안을 작성합니다.</p>
        </div>
        <Link href="/cover-letter/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            자소서 만들기
          </Button>
        </Link>
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {coverLetters?.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">아직 자소서가 없습니다.</p>
          <p className="text-xs mt-1">채용공고를 붙여넣고 자소서를 시작해보세요.</p>
        </div>
      )}

      <div className="grid gap-3">
        {coverLetters?.map((cl) => (
          <CoverLetterCard key={cl.id} coverLetter={cl} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 자소서 생성 페이지 구현**

`apps/web/app/cover-letter/new/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JobPostingInput } from '@/components/cover-letter/job-posting-input';
import { useCreateCoverLetter } from '@/hooks/use-cover-letters';
import { createCoverLetterSchema, type CreateCoverLetterInput, type JobPostingDto } from '@2chi/shared';

export default function NewCoverLetterPage() {
  const router = useRouter();
  const [parsedJobPosting, setParsedJobPosting] = useState<JobPostingDto | null>(null);
  const create = useCreateCoverLetter();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateCoverLetterInput>({
    resolver: zodResolver(createCoverLetterSchema),
    defaultValues: { title: '' },
  });

  const handleJobPostingParsed = (jp: JobPostingDto) => {
    setParsedJobPosting(jp);
    setValue('jobPostingId', jp.id);
    if (!jp.title) return;
    setValue('title', jp.title);
  };

  const onSubmit = async (data: CreateCoverLetterInput) => {
    const res = await create.mutateAsync(data);
    if (res.success) router.push(`/cover-letter/${res.data.id}`);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">자소서 만들기</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <JobPostingInput onParsed={handleJobPostingParsed} />
          {parsedJobPosting && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md text-xs text-blue-700 space-y-1">
              <p className="font-medium">공고 분석 완료</p>
              <p>직무: {parsedJobPosting.title}</p>
              {parsedJobPosting.requiredCompetencies.length > 0 && (
                <p>필수역량: {parsedJobPosting.requiredCompetencies.join(', ')}</p>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">자소서 제목</Label>
            <Input id="title" placeholder="예: 카카오 2024 하반기" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? '생성 중...' : '자소서 생성'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 자소서 편집 페이지 구현**

`apps/web/app/cover-letter/[id]/page.tsx`:
```typescript
'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemEditor } from '@/components/cover-letter/item-editor';
import { useCoverLetter, useAddCoverLetterItem } from '@/hooks/use-cover-letters';

export default function CoverLetterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: coverLetter, isLoading } = useCoverLetter(id);
  const addItem = useAddCoverLetterItem(id);
  const [newQuestion, setNewQuestion] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddItem = async () => {
    if (!newQuestion.trim()) return;
    await addItem.mutateAsync({
      question: newQuestion,
      order: coverLetter?.items.length ?? 0,
    });
    setNewQuestion('');
    setShowAddForm(false);
  };

  if (isLoading) return <div className="text-sm text-slate-500">불러오는 중...</div>;
  if (!coverLetter) return <div className="text-sm text-red-500">자소서를 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{coverLetter.title}</h1>
        {coverLetter.jobPosting && (
          <p className="text-sm text-slate-500 mt-0.5">{coverLetter.jobPosting.title}</p>
        )}
      </div>

      <div className="space-y-4">
        {coverLetter.items.map((item) => (
          <ItemEditor key={item.id} coverLetterId={id} item={item} />
        ))}

        {showAddForm ? (
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
            <Input
              placeholder="항목 질문을 입력하세요. 예: 지원 동기를 서술하세요."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddItem} disabled={addItem.isPending}>
                {addItem.isPending ? '추가 중...' : '항목 추가'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full flex items-center gap-2 text-slate-500"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4" />
            항목 추가
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: 개발 서버에서 전체 플로우 확인**

```bash
pnpm dev
```

확인 시나리오:
1. `/cover-letter` → 목록 (빈 상태)
2. `/cover-letter/new` → 채용공고 붙여넣기 → 공고 분석 → 자소서 생성
3. 자소서 상세 → 항목 추가 → "AI 초안 생성" → 스트리밍 확인
4. 내용 수정 → 저장 → "AI 피드백" → 피드백 패널 표시

- [ ] **Step 9: 커밋**

```bash
git add apps/web/app/cover-letter apps/web/components/cover-letter apps/web/hooks/use-cover-letters.ts apps/web/hooks/use-job-postings.ts
git commit -m "feat(web): add cover letter UI with SSE streaming and AI feedback"
```

---

## Self-Review

### Spec Coverage 체크

| Phase 1-C 요구사항 | 구현 태스크 |
|---|---|
| 채용공고 텍스트 파싱 (AI) | Task 2, 3 |
| 자소서 CRUD | Task 4 |
| 자소서 항목 추가/수정 | Task 4 |
| AI 초안 생성 (SSE 스트리밍) | Task 4 (streamDraft), Task 6 (ItemEditor) |
| AI 피드백 | Task 2, 4, 6 |
| E2E 테스트 | Task 4 |
| 공유 타입 | Task 1 |
| 자소서 목록 UI | Task 6 |
| 자소서 생성 UI | Task 6 |
| 자소서 편집 UI | Task 6 |

### Placeholder 검사
없음.

### 타입 일관성
- `streamDraft`는 AsyncGenerator<string>를 반환, Controller에서 for-await로 처리
- `feedback` 필드는 Prisma에서 `Json?`이므로 프론트에서 `as any` 캐스팅 필요 (플랜에 반영됨)
- SSE 응답 형식: `data: {"text":"..."}\n\n`, 완료: `data: [DONE]\n\n`
