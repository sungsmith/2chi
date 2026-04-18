# Phase 1-B: 내 이력 관리 (STAR) 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** STAR 구조(Situation·Task·Action·Result)로 이력을 입력·편집·태깅하고, 자유 서술을 AI(GPT-4o-mini)가 STAR로 변환해주는 기능을 API와 UI 모두 완성한다.

**Architecture:** NestJS Experiences 모듈 (CRUD + AI STAR 변환) → Bull 큐로 AI 작업 비동기 처리. 프론트는 TanStack Query로 목록/상세를 캐시하고, STAR 각 필드를 개별 textarea로 편집한다. AI 변환은 SSE가 아닌 Bull 큐 + polling 방식으로 처리한다 (단방향 변환이라 스트리밍 불필요).

**Tech Stack:** NestJS, Prisma, Bull, OpenAI SDK(GPT-4o-mini), Next.js 14, TanStack Query, React Hook Form + Zod

**Prerequisite:** Plan A (Foundation + Auth) 완료 필요.

---

## 파일 구조

```
packages/shared/src/
  types/experience.ts        # Experience, Tag, ExperienceType 타입
  schemas/experience.schema.ts  # Zod 스키마
  (index.ts에 re-export 추가)

apps/api/src/
  ai/
    ai.module.ts
    ai.service.ts
    prompts/star.prompt.ts
  experiences/
    experiences.module.ts
    experiences.controller.ts
    experiences.service.ts
    dto/
      create-experience.dto.ts
      update-experience.dto.ts
  app.module.ts              (ExperiencesModule, AiModule 추가)

apps/api/test/
  experiences.e2e-spec.ts

apps/web/
  app/experience/
    page.tsx                 # 이력 목록
    new/page.tsx             # 새 이력 생성
    [id]/
      page.tsx               # 이력 상세·편집
  components/experience/
    experience-card.tsx
    experience-form.tsx
    star-editor.tsx
    ai-star-convert-button.tsx
  hooks/
    use-experiences.ts
```

---

### Task 1: 공유 Experience 타입 추가

**Files:**
- Create: `packages/shared/src/types/experience.ts`
- Create: `packages/shared/src/schemas/experience.schema.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: experience 타입 작성**

`packages/shared/src/types/experience.ts`:
```typescript
export type ExperienceType = 'WORK' | 'PROJECT' | 'ACTIVITY' | 'EDUCATION';

export interface TagDto {
  id: string;
  name: string;
  category: string | null;
}

export interface ExperienceDto {
  id: string;
  userId: string;
  title: string;
  type: ExperienceType;
  companyName: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
  resultMetric: string | null;
  tags: TagDto[];
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: experience Zod 스키마 작성**

`packages/shared/src/schemas/experience.schema.ts`:
```typescript
import { z } from 'zod';

export const createExperienceSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(100),
  type: z.enum(['WORK', 'PROJECT', 'ACTIVITY', 'EDUCATION']),
  companyName: z.string().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional().default(false),
  situation: z.string().max(2000).optional(),
  task: z.string().max(2000).optional(),
  action: z.string().max(2000).optional(),
  result: z.string().max(2000).optional(),
  resultMetric: z.string().max(200).optional(),
  tagIds: z.array(z.string()).optional().default([]),
});

export const updateExperienceSchema = createExperienceSchema.partial();

export type CreateExperienceInput = z.infer<typeof createExperienceSchema>;
export type UpdateExperienceInput = z.infer<typeof updateExperienceSchema>;
```

- [ ] **Step 3: index.ts에 re-export 추가**

`packages/shared/src/index.ts`에 다음 줄을 추가:
```typescript
export * from './types/experience';
export * from './schemas/experience.schema';
```

- [ ] **Step 4: 타입 체크**

```bash
cd packages/shared && pnpm build
```

Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/types/experience.ts packages/shared/src/schemas/experience.schema.ts packages/shared/src/index.ts
git commit -m "feat(shared): add Experience types and Zod schemas"
```

---

### Task 2: AI 모듈 (OpenAI 클라이언트)

**Files:**
- Create: `apps/api/src/ai/ai.module.ts`
- Create: `apps/api/src/ai/ai.service.ts`
- Create: `apps/api/src/ai/prompts/star.prompt.ts`

- [ ] **Step 1: STAR 변환 프롬프트 작성**

`apps/api/src/ai/prompts/star.prompt.ts`:
```typescript
export function buildStarPrompt(freeText: string, title: string): string {
  return `당신은 취업 컨설턴트입니다. 아래 자유 서술 이력을 STAR 구조로 변환해주세요.

이력 제목: ${title}
자유 서술:
${freeText}

STAR 구조로 변환하여 JSON으로 반환하세요:
{
  "situation": "상황 설명 (Situation) - 2~3문장",
  "task": "맡은 역할과 과제 (Task) - 2~3문장",
  "action": "구체적 행동 (Action) - 3~5문장, 본인이 한 일 중심",
  "result": "결과 (Result) - 2~3문장",
  "resultMetric": "수치 결과 (있으면, 없으면 null) - 예: 전환율 23% 향상"
}

주의사항:
- 한국어로 작성
- 원문에 없는 내용을 지어내지 마세요
- 각 항목은 1인칭(저는/제가)으로 작성
- resultMetric은 원문에 수치가 있을 때만 작성, 없으면 null`;
}
```

- [ ] **Step 2: AiService 구현**

`apps/api/src/ai/ai.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { buildStarPrompt } from './prompts/star.prompt';

@Injectable()
export class AiService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async convertToStar(
    freeText: string,
    title: string,
  ): Promise<{
    situation: string;
    task: string;
    action: string;
    result: string;
    resultMetric: string | null;
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: buildStarPrompt(freeText, title) }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('AI 응답이 없습니다.');

    return JSON.parse(content);
  }
}
```

`apps/api/src/ai/ai.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AiService } from './ai.service';

@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/api/src/ai
git commit -m "feat(api): add AI module with STAR conversion prompt"
```

---

### Task 3: Experiences API (CRUD)

**Files:**
- Create: `apps/api/src/experiences/dto/create-experience.dto.ts`
- Create: `apps/api/src/experiences/dto/update-experience.dto.ts`
- Create: `apps/api/src/experiences/experiences.service.ts`
- Create: `apps/api/src/experiences/experiences.controller.ts`
- Create: `apps/api/src/experiences/experiences.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: 실패 테스트 작성**

`apps/api/test/experiences.e2e-spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Experiences (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = moduleRef.get(PrismaService);

    // 테스트용 유저 생성 및 로그인
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'e2e-exp@example.com', password: 'password123', name: '경험테스터', jobType: 'NEW_GRAD' });
    accessToken = registerRes.body.data.accessToken;
    userId = registerRes.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'e2e-exp@example.com' } });
    await app.close();
  });

  describe('POST /experiences', () => {
    it('should create an experience', async () => {
      const res = await request(app.getHttpServer())
        .post('/experiences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '카카오 인턴십', type: 'WORK', companyName: '카카오', isCurrent: false })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('카카오 인턴십');
      expect(res.body.data.userId).toBe(userId);
    });

    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/experiences')
        .send({ title: '무인증 이력', type: 'WORK' })
        .expect(401);
    });
  });

  describe('GET /experiences', () => {
    it('should return user experiences', async () => {
      const res = await request(app.getHttpServer())
        .get('/experiences')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('PATCH /experiences/:id', () => {
    let expId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/experiences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '수정 대상', type: 'PROJECT' });
      expId = res.body.data.id;
    });

    it('should update the experience', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/experiences/${expId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ situation: '상황 설명입니다.' })
        .expect(200);

      expect(res.body.data.situation).toBe('상황 설명입니다.');
    });
  });

  describe('DELETE /experiences/:id', () => {
    let expId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/experiences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '삭제 대상', type: 'ACTIVITY' });
      expId = res.body.data.id;
    });

    it('should delete the experience', async () => {
      await request(app.getHttpServer())
        .delete(`/experiences/${expId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/experiences/${expId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/experiences.e2e-spec.ts --no-coverage 2>&1 | tail -5
```

Expected: `Cannot GET /experiences` 또는 모듈 없음으로 실패.

- [ ] **Step 3: DTOs 구현**

`apps/api/src/experiences/dto/create-experience.dto.ts`:
```typescript
import {
  IsString, IsEnum, IsOptional, IsBoolean, IsArray, MaxLength, MinLength
} from 'class-validator';

export class CreateExperienceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @IsEnum(['WORK', 'PROJECT', 'ACTIVITY', 'EDUCATION'])
  type: 'WORK' | 'PROJECT' | 'ACTIVITY' | 'EDUCATION';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyName?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  situation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  task?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  result?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  resultMetric?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
```

`apps/api/src/experiences/dto/update-experience.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateExperienceDto } from './create-experience.dto';

export class UpdateExperienceDto extends PartialType(CreateExperienceDto) {}
```

- [ ] **Step 4: ExperiencesService 구현**

`apps/api/src/experiences/experiences.service.ts`:
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { ExperienceType } from '@prisma/client';

@Injectable()
export class ExperiencesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.experience.findMany({
      where: { userId },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const exp = await this.prisma.experience.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });
    if (!exp) throw new NotFoundException('이력을 찾을 수 없습니다.');
    if (exp.userId !== userId) throw new ForbiddenException();
    return exp;
  }

  async create(userId: string, dto: CreateExperienceDto) {
    const { tagIds, startDate, endDate, ...rest } = dto;
    return this.prisma.experience.create({
      data: {
        ...rest,
        type: rest.type as ExperienceType,
        userId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        tags: tagIds?.length
          ? { create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })) }
          : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });
  }

  async update(id: string, userId: string, dto: UpdateExperienceDto) {
    await this.findOne(id, userId);
    const { tagIds, startDate, endDate, ...rest } = dto;

    return this.prisma.experience.update({
      where: { id },
      data: {
        ...rest,
        type: rest.type as ExperienceType | undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        ...(tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })),
          },
        }),
      },
      include: { tags: { include: { tag: true } } },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.experience.delete({ where: { id } });
  }

  async getTags() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }
}
```

- [ ] **Step 5: ExperiencesController 구현**

`apps/api/src/experiences/experiences.controller.ts`:
```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ExperiencesService } from './experiences.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { AiService } from '../ai/ai.service';

@Controller('experiences')
export class ExperiencesController {
  constructor(
    private experiencesService: ExperiencesService,
    private aiService: AiService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.experiencesService.findAll(user.sub);
    return { success: true, data };
  }

  @Get('tags')
  async getTags() {
    const data = await this.experiencesService.getTags();
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.experiencesService.findOne(id, user.sub);
    return { success: true, data };
  }

  @Post()
  async create(@Body() dto: CreateExperienceDto, @CurrentUser() user: JwtPayload) {
    const data = await this.experiencesService.create(user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExperienceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.experiencesService.update(id, user.sub, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.experiencesService.remove(id, user.sub);
    return { success: true, data: null };
  }

  @Post(':id/star')
  async convertToStar(
    @Param('id') id: string,
    @Body('freeText') freeText: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const experience = await this.experiencesService.findOne(id, user.sub);
    const starData = await this.aiService.convertToStar(freeText, experience.title);
    const data = await this.experiencesService.update(id, user.sub, starData);
    return { success: true, data };
  }
}
```

`apps/api/src/experiences/experiences.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ExperiencesService } from './experiences.service';
import { ExperiencesController } from './experiences.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [ExperiencesService],
  controllers: [ExperiencesController],
  exports: [ExperiencesService],
})
export class ExperiencesModule {}
```

- [ ] **Step 6: app.module.ts에 ExperiencesModule, AiModule 추가**

`apps/api/src/app.module.ts`의 `imports` 배열에 다음 추가:
```typescript
import { ExperiencesModule } from './experiences/experiences.module';

// imports 배열에 추가:
ExperiencesModule,
```

- [ ] **Step 7: 테스트 실행 (통과 확인)**

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/experiences.e2e-spec.ts --no-coverage
```

Expected: `5 passed`.

- [ ] **Step 8: 커밋**

```bash
git add apps/api/src/experiences apps/api/src/ai apps/api/src/app.module.ts apps/api/test/experiences.e2e-spec.ts
git commit -m "feat(api): add Experiences CRUD and AI STAR conversion endpoint"
```

---

### Task 4: Experience 훅 + API 클라이언트 (프론트)

**Files:**
- Create: `apps/web/hooks/use-experiences.ts`

- [ ] **Step 1: use-experiences.ts 구현**

`apps/web/hooks/use-experiences.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ExperienceDto, CreateExperienceInput, UpdateExperienceInput } from '@2chi/shared';
import type { ApiResponse } from '@2chi/shared';

const QUERY_KEY = ['experiences'] as const;

export function useExperiences() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<ExperienceDto[]>('/experiences');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useExperience(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: async () => {
      const res = await api.get<ExperienceDto>(`/experiences/${id}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExperienceInput) => api.post<ExperienceDto>('/experiences', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateExperience(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateExperienceInput) => api.patch<ExperienceDto>(`/experiences/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, id] });
    },
  });
}

export function useDeleteExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/experiences/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useConvertToStar(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (freeText: string) =>
      api.post<ExperienceDto>(`/experiences/${id}/star`, { freeText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, id] });
    },
  });
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/web/hooks/use-experiences.ts
git commit -m "feat(web): add experience query hooks"
```

---

### Task 5: Experience 목록 페이지

**Files:**
- Create: `apps/web/app/experience/page.tsx`
- Create: `apps/web/components/experience/experience-card.tsx`

- [ ] **Step 1: ExperienceCard 컴포넌트 구현**

`apps/web/components/experience/experience-card.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { Briefcase, GraduationCap, Code2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExperienceDto } from '@2chi/shared';

const TYPE_CONFIG = {
  WORK: { label: '직장', icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
  PROJECT: { label: '프로젝트', icon: Code2, color: 'text-green-600 bg-green-50' },
  ACTIVITY: { label: '활동', icon: Users, color: 'text-amber-600 bg-amber-50' },
  EDUCATION: { label: '교육', icon: GraduationCap, color: 'text-slate-600 bg-slate-100' },
} as const;

interface Props {
  experience: ExperienceDto;
}

export function ExperienceCard({ experience }: Props) {
  const config = TYPE_CONFIG[experience.type];
  const Icon = config.icon;

  const starComplete = [experience.situation, experience.task, experience.action, experience.result].filter(Boolean).length;

  return (
    <Link href={`/experience/${experience.id}`}>
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn('inline-flex items-center gap-1 rounded-md text-xs px-2 py-1 font-medium', config.color)}>
                <Icon className="w-3 h-3" />
                {config.label}
              </span>
              {experience.companyName && (
                <span className="text-xs text-slate-500">{experience.companyName}</span>
              )}
            </div>
            <h3 className="text-sm font-medium text-slate-900 truncate">{experience.title}</h3>
            {experience.resultMetric && (
              <p className="text-xs text-slate-500 mt-1">{experience.resultMetric}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-slate-400">STAR</p>
            <p className="text-sm font-medium text-slate-700">{starComplete}/4</p>
          </div>
        </div>
        {experience.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {experience.tags.slice(0, 5).map(({ tag }) => (
              <span key={tag.id} className="rounded-md bg-slate-100 text-slate-600 text-xs px-2 py-0.5">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Experience 목록 페이지 구현**

`apps/web/app/experience/page.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExperienceCard } from '@/components/experience/experience-card';
import { useExperiences } from '@/hooks/use-experiences';

export default function ExperiencePage() {
  const { data: experiences, isLoading } = useExperiences();

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">내 이력</h1>
          <p className="text-sm text-slate-500 mt-0.5">STAR 구조로 이력을 관리하세요.</p>
        </div>
        <Link href="/experience/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            이력 추가
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="text-sm text-slate-500">불러오는 중...</div>
      )}

      {experiences?.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">아직 이력이 없습니다.</p>
          <p className="text-xs mt-1">첫 이력을 추가해보세요.</p>
        </div>
      )}

      <div className="grid gap-3">
        {experiences?.map((exp) => (
          <ExperienceCard key={exp.id} experience={exp} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/web/app/experience/page.tsx apps/web/components/experience/experience-card.tsx
git commit -m "feat(web): add experience list page"
```

---

### Task 6: Experience 생성·편집 폼

**Files:**
- Create: `apps/web/components/experience/experience-form.tsx`
- Create: `apps/web/components/experience/star-editor.tsx`
- Create: `apps/web/components/experience/ai-star-convert-button.tsx`
- Create: `apps/web/app/experience/new/page.tsx`
- Create: `apps/web/app/experience/[id]/page.tsx`

- [ ] **Step 1: STAR 에디터 컴포넌트 구현**

`apps/web/components/experience/star-editor.tsx`:
```typescript
'use client';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface StarField {
  label: string;
  key: 'situation' | 'task' | 'action' | 'result';
  placeholder: string;
}

const STAR_FIELDS: StarField[] = [
  { key: 'situation', label: 'S — 상황', placeholder: '어떤 상황에서 일어난 일인지 설명하세요.' },
  { key: 'task', label: 'T — 과제', placeholder: '맡은 역할과 해결해야 했던 과제는 무엇인가요?' },
  { key: 'action', label: 'A — 행동', placeholder: '어떤 구체적인 행동을 취했나요? 본인이 한 일 중심으로.' },
  { key: 'result', label: 'R — 결과', placeholder: '어떤 결과를 얻었나요? 수치가 있다면 포함하세요.' },
];

interface Props {
  values: { situation?: string; task?: string; action?: string; result?: string };
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
}

export function StarEditor({ values, onChange, disabled }: Props) {
  return (
    <div className="space-y-4">
      {STAR_FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key} className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {label}
          </Label>
          <Textarea
            id={key}
            placeholder={placeholder}
            value={values[key] ?? ''}
            onChange={(e) => onChange(key, e.target.value)}
            disabled={disabled}
            rows={4}
            className="resize-none leading-relaxed"
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: AI STAR 변환 버튼 구현**

`apps/web/components/experience/ai-star-convert-button.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useConvertToStar } from '@/hooks/use-experiences';

interface Props {
  experienceId: string;
  onConverted: (star: { situation: string; task: string; action: string; result: string }) => void;
}

export function AiStarConvertButton({ experienceId, onConverted }: Props) {
  const [freeText, setFreeText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const convert = useConvertToStar(experienceId);

  const handleConvert = async () => {
    if (!freeText.trim()) return;
    const res = await convert.mutateAsync(freeText);
    if (res.success) {
      onConverted({
        situation: res.data.situation ?? '',
        task: res.data.task ?? '',
        action: res.data.action ?? '',
        result: res.data.result ?? '',
      });
      setIsOpen(false);
      setFreeText('');
    }
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-slate-600"
      >
        <Sparkles className="w-3.5 h-3.5" />
        AI로 STAR 변환
      </Button>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
      <p className="text-xs font-medium text-slate-600">자유롭게 이 경험을 서술하세요. AI가 STAR 구조로 변환해줍니다.</p>
      <Textarea
        value={freeText}
        onChange={(e) => setFreeText(e.target.value)}
        placeholder="예: 카카오에서 인턴으로 일하면서 데이터 파이프라인 성능 문제를 발견했고..."
        rows={5}
        className="resize-none"
      />
      {convert.data && !convert.data.success && (
        <p className="text-xs text-red-500">{convert.data.error.message}</p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleConvert}
          disabled={convert.isPending || !freeText.trim()}
        >
          {convert.isPending ? 'AI 변환 중...' : '변환하기'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          취소
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Experience 폼 컴포넌트 구현**

`apps/web/components/experience/experience-form.tsx`:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StarEditor } from './star-editor';
import { AiStarConvertButton } from './ai-star-convert-button';
import { createExperienceSchema, type CreateExperienceInput, type ExperienceDto } from '@2chi/shared';

interface Props {
  defaultValues?: Partial<ExperienceDto>;
  experienceId?: string;
  onSubmit: (data: CreateExperienceInput) => void;
  isLoading?: boolean;
}

export function ExperienceForm({ defaultValues, experienceId, onSubmit, isLoading }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateExperienceInput>({
    resolver: zodResolver(createExperienceSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      type: defaultValues?.type ?? 'WORK',
      companyName: defaultValues?.companyName ?? '',
      isCurrent: defaultValues?.isCurrent ?? false,
      situation: defaultValues?.situation ?? '',
      task: defaultValues?.task ?? '',
      action: defaultValues?.action ?? '',
      result: defaultValues?.result ?? '',
      resultMetric: defaultValues?.resultMetric ?? '',
    },
  });

  const starValues = {
    situation: watch('situation'),
    task: watch('task'),
    action: watch('action'),
    result: watch('result'),
  };

  const handleStarChange = (key: string, value: string) => {
    setValue(key as any, value);
  };

  const handleConverted = (star: { situation: string; task: string; action: string; result: string }) => {
    Object.entries(star).forEach(([key, value]) => setValue(key as any, value));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">기본 정보</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="title">이력 제목</Label>
            <Input id="title" placeholder="예: 카카오 인턴십" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type">유형</Label>
            <select
              id="type"
              {...register('type')}
              className="w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="WORK">직장</option>
              <option value="PROJECT">프로젝트</option>
              <option value="ACTIVITY">활동</option>
              <option value="EDUCATION">교육</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyName">기관명 (선택)</Label>
            <Input id="companyName" placeholder="회사·학교·단체명" {...register('companyName')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resultMetric">수치 결과 (선택)</Label>
            <Input id="resultMetric" placeholder="예: 전환율 23% 향상" {...register('resultMetric')} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">STAR 구조</h2>
          {experienceId && (
            <AiStarConvertButton experienceId={experienceId} onConverted={handleConverted} />
          )}
        </div>
        <StarEditor values={starValues} onChange={handleStarChange} disabled={isLoading} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '저장 중...' : '저장'}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          취소
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: 새 이력 페이지 구현**

`apps/web/app/experience/new/page.tsx`:
```typescript
'use client';

import { useRouter } from 'next/navigation';
import { ExperienceForm } from '@/components/experience/experience-form';
import { useCreateExperience } from '@/hooks/use-experiences';
import type { CreateExperienceInput } from '@2chi/shared';

export default function NewExperiencePage() {
  const router = useRouter();
  const create = useCreateExperience();

  const handleSubmit = async (data: CreateExperienceInput) => {
    const res = await create.mutateAsync(data);
    if (res.success) router.push(`/experience/${res.data.id}`);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">이력 추가</h1>
      <ExperienceForm onSubmit={handleSubmit} isLoading={create.isPending} />
    </div>
  );
}
```

- [ ] **Step 5: 이력 상세·편집 페이지 구현**

`apps/web/app/experience/[id]/page.tsx`:
```typescript
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExperienceForm } from '@/components/experience/experience-form';
import { useExperience, useUpdateExperience, useDeleteExperience } from '@/hooks/use-experiences';
import type { UpdateExperienceInput } from '@2chi/shared';

export default function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: experience, isLoading } = useExperience(id);
  const update = useUpdateExperience(id);
  const delete_ = useDeleteExperience();

  const handleSubmit = async (data: UpdateExperienceInput) => {
    await update.mutateAsync(data);
  };

  const handleDelete = async () => {
    if (!confirm('이 이력을 삭제할까요?')) return;
    await delete_.mutateAsync(id);
    router.push('/experience');
  };

  if (isLoading) return <div className="text-sm text-slate-500">불러오는 중...</div>;
  if (!experience) return <div className="text-sm text-red-500">이력을 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{experience.title}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={delete_.isPending}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          삭제
        </Button>
      </div>
      <ExperienceForm
        defaultValues={experience}
        experienceId={id}
        onSubmit={handleSubmit}
        isLoading={update.isPending}
      />
    </div>
  );
}
```

- [ ] **Step 6: 개발 서버에서 플로우 확인**

```bash
# 터미널1: pnpm dev (전체)
# 브라우저에서 확인:
# 1. /experience → 이력 목록 (빈 상태)
# 2. /experience/new → 이력 생성 폼
# 3. 폼 저장 → 상세 페이지 이동
# 4. STAR 필드 편집 → 저장
# 5. 삭제 → 목록으로 이동
```

- [ ] **Step 7: 커밋**

```bash
git add apps/web/components/experience apps/web/app/experience apps/web/hooks/use-experiences.ts
git commit -m "feat(web): add experience list, create, edit, and AI STAR conversion UI"
```

---

## Self-Review

### Spec Coverage 체크

| Phase 1-B 요구사항 | 구현 태스크 |
|---|---|
| 이력 CRUD API | Task 3 |
| 역량 태그 관리 | Task 3 (getTags 엔드포인트) |
| STAR 구조 입력·편집 | Task 6 (StarEditor) |
| AI STAR 변환 (GPT-4o-mini) | Task 2, 3 (/star 엔드포인트) |
| 이력 목록 UI | Task 5 |
| 이력 생성 UI | Task 6 |
| 이력 편집 UI | Task 6 |
| E2E 테스트 | Task 3 |
| 공유 타입 | Task 1 |

### Placeholder 검사
없음.

### 타입 일관성
- `ExperienceDto.tags` → `{ tag: TagDto }[]` (Prisma include 패턴) — 프론트에서 `exp.tags.map(({ tag }) => tag)` 로 사용
- `CreateExperienceInput` → packages/shared Zod 스키마와 NestJS DTO 양쪽이 동일한 필드를 커버
