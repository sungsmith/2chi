# Application Stage Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지원현황의 전형 단계를 고도화한다 — 커스텀 카테고리(코딩테스트/사전과제 등), 단계별 날짜 레이블, 카테고리별 캘린더 색상, 단계 결과 표기 + 합격 시 다음 일정 유도 팝업.

**Architecture:** Prisma에 `CUSTOM` 단계 enum 값과 `customLabel` 필드를 추가하고, 공유 타입에 단계별 레이블·색상 헬퍼를 정의해 프론트/백 양쪽에서 사용한다. ApplicationCard에 전형 히스토리를 인라인으로 표시하고, CalendarView는 applications.stages에서 직접 이벤트를 파생시켜 단계별 색상을 적용한다.

**Tech Stack:** NestJS + Prisma (PostgreSQL), Next.js 14 App Router, TanStack Query, shadcn/ui + Tailwind, `packages/shared` 공유 타입

---

## File Structure

**Modified:**
- `apps/api/prisma/schema.prisma` — `ApplicationStage` enum에 `CUSTOM` 추가, `ApplicationStageHistory`에 `customLabel String?` 추가
- `packages/shared/src/types/application.ts` — `ApplicationStage`에 `CUSTOM` 추가, DTO에 `customLabel` 추가, 단계별 레이블·색상 헬퍼 추가, `UpdateStageInput` 타입 추가
- `apps/api/src/applications/dto/add-stage.dto.ts` — `CUSTOM` 허용, `customLabel` 필드 추가
- `apps/api/src/applications/applications.service.ts` — `addStage`에서 DOCUMENT→DEADLINE 이벤트 생성, CUSTOM→OTHER 이벤트 생성, `customLabel` 저장; `updateStage` 메서드 추가
- `apps/api/src/applications/applications.controller.ts` — `PATCH /applications/:id/stages/:stageId` 엔드포인트 추가
- `apps/web/hooks/use-applications.ts` — `useUpdateStage` mutation 추가
- `apps/web/components/applications/application-card.tsx` — 단계 히스토리 인라인 표시, 결과 뱃지, "단계 추가" 버튼, PASS 시 팝업
- `apps/web/components/applications/calendar-view.tsx` — applications.stages에서 단계별 색상 이벤트 파생

**Created:**
- `apps/api/src/applications/dto/update-stage.dto.ts` — 결과 업데이트 DTO
- `apps/web/components/applications/add-stage-modal.tsx` — 전형 추가 모달 (커스텀 카테고리 입력 포함)

---

## Task 1: Prisma Schema + Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: ApplicationStage enum에 CUSTOM 추가, ApplicationStageHistory에 customLabel 추가**

`schema.prisma`에서 ApplicationStage enum과 ApplicationStageHistory 모델을 아래처럼 변경한다:

```prisma
enum ApplicationStage {
  DOCUMENT
  FIRST_INTERVIEW
  SECOND_INTERVIEW
  FINAL_INTERVIEW
  OFFER
  DONE
  CUSTOM
}

model ApplicationStageHistory {
  id            String           @id @default(cuid())
  applicationId String
  stage         ApplicationStage
  customLabel   String?          // stage=CUSTOM일 때 사용 (예: 코딩테스트, 사전과제)
  scheduledAt   DateTime?
  result        ApplicationResult?
  note          String?
  createdAt     DateTime         @default(now())
  application   Application      @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: 마이그레이션 실행**

```bash
cd /Users/sungjiwon/claude/2chi/apps/api
npx prisma migrate dev --name add-custom-stage
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 3: Prisma client 재생성 확인**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
cd /Users/sungjiwon/claude/2chi
git add apps/api/prisma/
git commit -m "feat: add CUSTOM stage type and customLabel to ApplicationStageHistory"
```

---

## Task 2: Shared Types 업데이트

**Files:**
- Modify: `packages/shared/src/types/application.ts`

- [ ] **Step 1: `application.ts` 전체를 아래 내용으로 교체**

```typescript
export type ApplicationStage =
  | 'DOCUMENT'
  | 'FIRST_INTERVIEW'
  | 'SECOND_INTERVIEW'
  | 'FINAL_INTERVIEW'
  | 'OFFER'
  | 'DONE'
  | 'CUSTOM';

export type ApplicationResult = 'PASS' | 'FAIL' | 'PENDING' | 'WITHDRAWN';
export type EventType = 'DEADLINE' | 'INTERVIEW' | 'OTHER';

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  DOCUMENT: '서류',
  FIRST_INTERVIEW: '1차 면접',
  SECOND_INTERVIEW: '2차 면접',
  FINAL_INTERVIEW: '최종 면접',
  OFFER: '합격통보',
  DONE: '완료',
  CUSTOM: '기타',
};

/** 해당 단계에서 scheduledAt이 의미하는 날짜 레이블 */
export const STAGE_DATE_LABELS: Record<ApplicationStage, string> = {
  DOCUMENT: '마감일',
  FIRST_INTERVIEW: '면접일',
  SECOND_INTERVIEW: '면접일',
  FINAL_INTERVIEW: '면접일',
  OFFER: '통보일',
  DONE: '완료일',
  CUSTOM: '응시일',
};

/** 캘린더에서 사용할 Tailwind 색상 클래스 */
export const STAGE_COLORS: Record<ApplicationStage, { dot: string; badge: string; label: string }> = {
  DOCUMENT: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-600', label: '마감' },
  FIRST_INTERVIEW: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700', label: '1차 면접' },
  SECOND_INTERVIEW: { dot: 'bg-blue-600', badge: 'bg-blue-100 text-blue-800', label: '2차 면접' },
  FINAL_INTERVIEW: { dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700', label: '최종 면접' },
  OFFER: { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700', label: '합격통보' },
  DONE: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600', label: '완료' },
  CUSTOM: { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700', label: '기타' },
};

export const RESULT_LABELS: Record<ApplicationResult, string> = {
  PASS: '합격',
  FAIL: '불합격',
  PENDING: '대기',
  WITHDRAWN: '포기',
};

export const RESULT_COLORS: Record<ApplicationResult, string> = {
  PASS: 'text-green-600 bg-green-50',
  FAIL: 'text-red-500 bg-red-50',
  PENDING: 'text-amber-600 bg-amber-50',
  WITHDRAWN: 'text-slate-500 bg-slate-100',
};

export interface ApplicationStageHistoryDto {
  id: string;
  applicationId: string;
  stage: ApplicationStage;
  customLabel: string | null;
  scheduledAt: string | null;
  result: ApplicationResult | null;
  note: string | null;
  createdAt: string;
}

export interface ApplicationDto {
  id: string;
  userId: string;
  jobPostingId: string | null;
  companyId: string | null;
  coverLetterId: string | null;
  careerDescriptionId: string | null;
  appliedAt: string | null;
  currentStage: ApplicationStage;
  result: ApplicationResult | null;
  memo: string | null;
  stages: ApplicationStageHistoryDto[];
  company: { id: string; name: string } | null;
  jobPosting: { id: string; title: string; deadline: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventDto {
  id: string;
  userId: string;
  applicationId: string | null;
  title: string;
  eventType: EventType;
  scheduledAt: string;
  reminderAt: string | null;
  isNotified: boolean;
  createdAt: string;
}

export interface CreateApplicationInput {
  companyId?: string;
  jobPostingId?: string;
  coverLetterId?: string;
  appliedAt?: string;
  currentStage?: ApplicationStage;
  memo?: string;
}

export interface AddStageInput {
  stage: ApplicationStage;
  customLabel?: string;
  scheduledAt?: string;
  result?: ApplicationResult;
  note?: string;
}

export interface UpdateStageInput {
  result?: ApplicationResult;
  note?: string;
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd /Users/sungjiwon/claude/2chi
pnpm --filter @2chi/shared build
```

Expected: 오류 없이 빌드 완료

- [ ] **Step 3: Commit**

```bash
git add packages/shared/
git commit -m "feat: add CUSTOM stage to shared types, add stage label/color helpers"
```

---

## Task 3: Backend DTO + Service + Controller

**Files:**
- Modify: `apps/api/src/applications/dto/add-stage.dto.ts`
- Create: `apps/api/src/applications/dto/update-stage.dto.ts`
- Modify: `apps/api/src/applications/applications.service.ts`
- Modify: `apps/api/src/applications/applications.controller.ts`

- [ ] **Step 1: `add-stage.dto.ts` 수정**

```typescript
import { IsEnum, IsOptional, IsDateString, IsString, MaxLength } from 'class-validator';

const VALID_STAGES = ['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW', 'OFFER', 'DONE', 'CUSTOM'];

export class AddStageDto {
  @IsEnum(VALID_STAGES)
  stage!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  customLabel?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsEnum(['PASS', 'FAIL', 'PENDING', 'WITHDRAWN'])
  result?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
```

- [ ] **Step 2: `update-stage.dto.ts` 생성**

```typescript
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStageDto {
  @IsOptional()
  @IsEnum(['PASS', 'FAIL', 'PENDING', 'WITHDRAWN'])
  result?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
```

- [ ] **Step 3: `applications.service.ts` 수정**

`addStage` 메서드에 `customLabel` 저장, DOCUMENT→DEADLINE 이벤트 생성, CUSTOM→OTHER 이벤트 생성 로직 추가. 새 `updateStage` 메서드 추가.

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AddStageDto } from './dto/add-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ApplicationStage, ApplicationResult } from '@prisma/client';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.application.findMany({
      where: { userId },
      include: {
        stages: { orderBy: { createdAt: 'asc' } },
        company: { select: { id: true, name: true } },
        jobPosting: { select: { id: true, title: true, deadline: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { createdAt: 'asc' } },
        company: { select: { id: true, name: true } },
        jobPosting: { select: { id: true, title: true, deadline: true } },
      },
    });
    if (!app) throw new NotFoundException('지원 현황을 찾을 수 없습니다.');
    if (app.userId !== userId) throw new ForbiddenException();
    return app;
  }

  async create(userId: string, dto: CreateApplicationDto) {
    const { appliedAt, currentStage, ...rest } = dto;
    const app = await this.prisma.application.create({
      data: {
        ...rest,
        userId,
        appliedAt: appliedAt ? new Date(appliedAt) : undefined,
        currentStage: (currentStage ?? 'DOCUMENT') as ApplicationStage,
      },
      include: {
        stages: true,
        company: { select: { id: true, name: true } },
        jobPosting: { select: { id: true, title: true, deadline: true } },
      },
    });

    if (app.jobPosting?.deadline) {
      await this.prisma.calendarEvent.create({
        data: {
          userId,
          applicationId: app.id,
          title: `[마감] ${app.jobPosting.title}`,
          eventType: 'DEADLINE',
          scheduledAt: new Date(app.jobPosting.deadline),
        },
      });
    }

    return app;
  }

  async update(id: string, userId: string, dto: UpdateApplicationDto) {
    await this.findOne(id, userId);
    const { appliedAt, currentStage, result, ...rest } = dto;
    return this.prisma.application.update({
      where: { id },
      data: {
        ...rest,
        appliedAt: appliedAt ? new Date(appliedAt) : undefined,
        currentStage: currentStage as ApplicationStage | undefined,
        result: result as ApplicationResult | undefined,
      },
      include: {
        stages: { orderBy: { createdAt: 'asc' } },
        company: { select: { id: true, name: true } },
        jobPosting: { select: { id: true, title: true, deadline: true } },
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.application.delete({ where: { id } });
  }

  async addStage(applicationId: string, userId: string, dto: AddStageDto) {
    const app = await this.findOne(applicationId, userId);
    const { stage, customLabel, scheduledAt, result, note } = dto;

    const stageHistory = await this.prisma.applicationStageHistory.create({
      data: {
        applicationId,
        stage: stage as ApplicationStage,
        customLabel: stage === 'CUSTOM' ? (customLabel ?? null) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        result: result as ApplicationResult | undefined,
        note,
      },
    });

    // DOCUMENT + scheduledAt → 마감일 캘린더 이벤트
    if (scheduledAt && stage === 'DOCUMENT') {
      const companyName = app.company?.name ?? app.memo ?? app.jobPosting?.title ?? '서류';
      await this.prisma.calendarEvent.create({
        data: {
          userId,
          applicationId,
          title: `[마감] ${companyName}`,
          eventType: 'DEADLINE',
          scheduledAt: new Date(scheduledAt),
        },
      });
    }

    // 면접 단계 → 면접 캘린더 이벤트
    const interviewStages = new Set(['FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW']);
    if (scheduledAt && interviewStages.has(stage)) {
      const stageLabel: Record<string, string> = {
        FIRST_INTERVIEW: '1차',
        SECOND_INTERVIEW: '2차',
        FINAL_INTERVIEW: '최종',
      };
      const companyName = app.company?.name ?? app.memo ?? app.jobPosting?.title ?? '면접';
      await this.prisma.calendarEvent.create({
        data: {
          userId,
          applicationId,
          title: `[면접] ${companyName} ${stageLabel[stage] ?? ''}`,
          eventType: 'INTERVIEW',
          scheduledAt: new Date(scheduledAt),
        },
      });
    }

    // CUSTOM + scheduledAt → 기타 캘린더 이벤트
    if (scheduledAt && stage === 'CUSTOM') {
      const displayLabel = customLabel ?? '기타';
      const companyName = app.company?.name ?? app.memo ?? '';
      await this.prisma.calendarEvent.create({
        data: {
          userId,
          applicationId,
          title: `[${displayLabel}] ${companyName}`.trim(),
          eventType: 'OTHER',
          scheduledAt: new Date(scheduledAt),
        },
      });
    }

    return stageHistory;
  }

  async updateStage(applicationId: string, stageId: string, userId: string, dto: UpdateStageDto) {
    await this.findOne(applicationId, userId);
    const stageHistory = await this.prisma.applicationStageHistory.findUnique({ where: { id: stageId } });
    if (!stageHistory || stageHistory.applicationId !== applicationId) {
      throw new NotFoundException('전형 기록을 찾을 수 없습니다.');
    }
    return this.prisma.applicationStageHistory.update({
      where: { id: stageId },
      data: {
        result: dto.result as ApplicationResult | undefined,
        note: dto.note,
      },
    });
  }
}
```

- [ ] **Step 4: `applications.controller.ts` 수정 — `PATCH /:id/stages/:stageId` 추가**

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AddStageDto } from './dto/add-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('applications')
export class ApplicationsController {
  constructor(private applicationsService: ApplicationsService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.applicationsService.findAll(user.sub);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.applicationsService.findOne(id, user.sub);
    return { success: true, data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateApplicationDto, @CurrentUser() user: JwtPayload) {
    const data = await this.applicationsService.create(user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.applicationsService.update(id, user.sub, dto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.applicationsService.remove(id, user.sub);
    return { success: true, data: null };
  }

  @Post(':id/stages')
  @HttpCode(HttpStatus.CREATED)
  async addStage(
    @Param('id') id: string,
    @Body() dto: AddStageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.applicationsService.addStage(id, user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id/stages/:stageId')
  async updateStage(
    @Param('id') id: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.applicationsService.updateStage(id, stageId, user.sub, dto);
    return { success: true, data };
  }
}
```

- [ ] **Step 5: TypeScript 컴파일 확인**

```bash
cd /Users/sungjiwon/claude/2chi/apps/api
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 6: Commit**

```bash
cd /Users/sungjiwon/claude/2chi
git add apps/api/src/applications/
git commit -m "feat: add CUSTOM stage support, DOCUMENT deadline event, updateStage endpoint"
```

---

## Task 4: Frontend Hook 추가

**Files:**
- Modify: `apps/web/hooks/use-applications.ts`

- [ ] **Step 1: `use-applications.ts` 수정 — `useUpdateStage` 추가**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ApplicationDto,
  ApplicationStageHistoryDto,
  CreateApplicationInput,
  AddStageInput,
  UpdateStageInput,
} from '@2chi/shared';

const APP_KEY = ['applications'] as const;

export function useApplications() {
  return useQuery({
    queryKey: APP_KEY,
    queryFn: async () => {
      const res = await api.get<ApplicationDto[]>('/applications');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateApplicationInput) => api.post<ApplicationDto>('/applications', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}

export function useUpdateApplication(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateApplicationInput> & { result?: string }) =>
      api.patch<ApplicationDto>(`/applications/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/applications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}

export function useAddStage(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddStageInput) =>
      api.post<ApplicationStageHistoryDto>(`/applications/${applicationId}/stages`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}

export function useUpdateStage(applicationId: string, stageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateStageInput) =>
      api.patch<ApplicationStageHistoryDto>(`/applications/${applicationId}/stages/${stageId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sungjiwon/claude/2chi
git add apps/web/hooks/use-applications.ts
git commit -m "feat: add useUpdateStage hook"
```

---

## Task 5: AddStageModal 컴포넌트

**Files:**
- Create: `apps/web/components/applications/add-stage-modal.tsx`

이 컴포넌트는 전형 단계 추가 모달이다. 단계 선택 시 날짜 레이블이 동적으로 변하고, `CUSTOM` 선택 시 직접 입력 필드가 나타난다.

- [ ] **Step 1: `add-stage-modal.tsx` 생성**

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAddStage } from '@/hooks/use-applications';
import { STAGE_LABELS, STAGE_DATE_LABELS, type ApplicationStage } from '@2chi/shared';

const SELECTABLE_STAGES: ApplicationStage[] = [
  'DOCUMENT',
  'FIRST_INTERVIEW',
  'SECOND_INTERVIEW',
  'FINAL_INTERVIEW',
  'OFFER',
  'CUSTOM',
];

const schema = z.object({
  stage: z.enum(['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW', 'OFFER', 'DONE', 'CUSTOM']),
  customLabel: z.string().max(50).optional(),
  scheduledAt: z.string().optional(),
  result: z.enum(['PASS', 'FAIL', 'PENDING', 'WITHDRAWN']).optional(),
  note: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  applicationId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddStageModal({ applicationId, onClose, onSuccess }: Props) {
  const addStage = useAddStage(applicationId);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { stage: 'FIRST_INTERVIEW' },
  });

  const selectedStage = watch('stage') as ApplicationStage;
  const isCustom = selectedStage === 'CUSTOM';
  const dateLabelText = STAGE_DATE_LABELS[selectedStage] ?? '날짜';

  async function onSubmit(values: FormValues) {
    await addStage.mutateAsync({
      stage: values.stage as ApplicationStage,
      customLabel: values.customLabel,
      scheduledAt: values.scheduledAt || undefined,
      result: values.result,
      note: values.note,
    });
    onSuccess?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">전형 단계 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 단계 선택 */}
          <div className="space-y-1.5">
            <Label>전형 단계</Label>
            <select
              {...register('stage')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SELECTABLE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
            {errors.stage && <p className="text-xs text-red-500">{errors.stage.message}</p>}
          </div>

          {/* 기타 직접 입력 */}
          {isCustom && (
            <div className="space-y-1.5">
              <Label>카테고리 직접 입력 <span className="text-slate-400 text-xs">(예: 코딩테스트, 사전과제)</span></Label>
              <Input
                {...register('customLabel')}
                placeholder="카테고리명을 입력하세요"
                maxLength={50}
              />
              {errors.customLabel && <p className="text-xs text-red-500">{errors.customLabel.message}</p>}
            </div>
          )}

          {/* 날짜 (레이블이 단계에 따라 변함) */}
          <div className="space-y-1.5">
            <Label>{dateLabelText} <span className="text-slate-400 text-xs">(선택)</span></Label>
            <Input type="date" {...register('scheduledAt')} />
          </div>

          {/* 결과 */}
          <div className="space-y-1.5">
            <Label>결과 <span className="text-slate-400 text-xs">(선택)</span></Label>
            <select
              {...register('result')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">미결정</option>
              <option value="PASS">합격</option>
              <option value="FAIL">불합격</option>
              <option value="PENDING">대기</option>
              <option value="WITHDRAWN">포기</option>
            </select>
          </div>

          {/* 메모 */}
          <div className="space-y-1.5">
            <Label>메모 <span className="text-slate-400 text-xs">(선택)</span></Label>
            <Input {...register('note')} placeholder="추가 메모" maxLength={500} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              추가
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sungjiwon/claude/2chi
git add apps/web/components/applications/add-stage-modal.tsx
git commit -m "feat: add AddStageModal with custom category input and dynamic date label"
```

---

## Task 6: ApplicationCard 고도화

**Files:**
- Modify: `apps/web/components/applications/application-card.tsx`

ApplicationCard에 전형 히스토리 인라인 표시, 결과 뱃지, "단계 추가" 버튼, 결과 업데이트 select, PASS 시 "다음 단계 추가" 팝업을 추가한다.

- [ ] **Step 1: `application-card.tsx` 전체 교체**

```tsx
'use client';

import { useState } from 'react';
import { Trash2, Pencil, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeleteApplication, useUpdateStage } from '@/hooks/use-applications';
import { EditApplicationModal } from './edit-application-modal';
import { AddStageModal } from './add-stage-modal';
import {
  STAGE_LABELS,
  STAGE_COLORS,
  STAGE_DATE_LABELS,
  RESULT_LABELS,
  RESULT_COLORS,
  type ApplicationDto,
  type ApplicationStageHistoryDto,
  type ApplicationResult,
} from '@2chi/shared';

function StageResultSelect({
  stage,
  applicationId,
  onPass,
}: {
  stage: ApplicationStageHistoryDto;
  applicationId: string;
  onPass: () => void;
}) {
  const updateStage = useUpdateStage(applicationId, stage.id);

  async function handleChange(result: string) {
    await updateStage.mutateAsync({ result: result as ApplicationResult });
    if (result === 'PASS') onPass();
  }

  return (
    <select
      value={stage.result ?? ''}
      onChange={(e) => handleChange(e.target.value)}
      className="text-xs border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">결과 선택</option>
      <option value="PASS">합격</option>
      <option value="FAIL">불합격</option>
      <option value="PENDING">대기</option>
      <option value="WITHDRAWN">포기</option>
    </select>
  );
}

export function ApplicationCard({ application }: { application: ApplicationDto }) {
  const delete_ = useDeleteApplication();
  const [showEdit, setShowEdit] = useState(false);
  const [showAddStage, setShowAddStage] = useState(false);
  const [showStages, setShowStages] = useState(false);
  const [showNextStagePrompt, setShowNextStagePrompt] = useState(false);

  const displayName =
    application.company?.name ??
    application.memo ??
    application.jobPosting?.title ??
    '(미입력)';

  const overallResult = application.result;

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm group">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
            {application.jobPosting && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{application.jobPosting.title}</p>
            )}
            {application.appliedAt && (
              <p className="text-xs text-slate-400 mt-1">
                지원일: {application.appliedAt.slice(0, 10)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => setShowAddStage(true)}
              className="text-slate-400 hover:text-green-500 p-1"
              aria-label="단계 추가"
              title="전형 단계 추가"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="text-slate-400 hover:text-blue-500 p-1"
              aria-label="수정"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (confirm('이 지원 현황을 삭제할까요?')) delete_.mutate(application.id);
              }}
              className="text-slate-400 hover:text-red-500 p-1"
              aria-label="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 전체 결과 뱃지 */}
        {overallResult && (
          <span
            className={cn(
              'inline-block mt-2 rounded-full text-xs font-medium px-2.5 py-0.5',
              RESULT_COLORS[overallResult],
            )}
          >
            {RESULT_LABELS[overallResult]}
          </span>
        )}

        {/* 전형 히스토리 토글 */}
        {application.stages.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowStages((v) => !v)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              {showStages ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              전형 기록 {application.stages.length}개
            </button>

            {showStages && (
              <div className="mt-2 space-y-2">
                {application.stages.map((stage) => {
                  const stageKey = stage.stage;
                  const color = STAGE_COLORS[stageKey];
                  const stageName =
                    stageKey === 'CUSTOM'
                      ? (stage.customLabel ?? '기타')
                      : STAGE_LABELS[stageKey];
                  const dateLabel = STAGE_DATE_LABELS[stageKey];

                  return (
                    <div
                      key={stage.id}
                      className="flex items-start justify-between gap-2 bg-slate-50 rounded-md px-2.5 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('w-2 h-2 rounded-full shrink-0', color.dot)} />
                          <span className="text-xs font-medium text-slate-800">{stageName}</span>
                          {stage.result && (
                            <span
                              className={cn(
                                'text-xs rounded-full px-1.5 py-0 font-medium',
                                RESULT_COLORS[stage.result],
                              )}
                            >
                              {RESULT_LABELS[stage.result]}
                            </span>
                          )}
                        </div>
                        {stage.scheduledAt && (
                          <p className="text-xs text-slate-400 mt-0.5 ml-3.5">
                            {dateLabel}: {stage.scheduledAt.slice(0, 10)}
                          </p>
                        )}
                        {stage.note && (
                          <p className="text-xs text-slate-400 mt-0.5 ml-3.5 truncate">{stage.note}</p>
                        )}
                      </div>
                      <StageResultSelect
                        stage={stage}
                        applicationId={application.id}
                        onPass={() => setShowNextStagePrompt(true)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 단계 없을 때 추가 버튼 */}
        {application.stages.length === 0 && (
          <button
            onClick={() => setShowAddStage(true)}
            className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-blue-500 border border-dashed border-slate-200 hover:border-blue-300 rounded-md py-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" />
            전형 단계 추가
          </button>
        )}
      </div>

      {/* 합격 시 다음 단계 유도 팝업 */}
      {showNextStagePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <div className="text-2xl mb-2">🎉</div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">합격을 축하합니다!</h3>
            <p className="text-sm text-slate-500 mb-5">다음 전형 일정도 기록해두시겠어요?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNextStagePrompt(false)}
                className="flex-1 border border-slate-200 rounded-lg py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                나중에
              </button>
              <button
                onClick={() => {
                  setShowNextStagePrompt(false);
                  setShowAddStage(true);
                }}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
              >
                다음 단계 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <EditApplicationModal application={application} onClose={() => setShowEdit(false)} />
      )}

      {showAddStage && (
        <AddStageModal
          applicationId={application.id}
          onClose={() => setShowAddStage(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: TypeScript 타입 확인**

```bash
cd /Users/sungjiwon/claude/2chi/apps/web
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: Commit**

```bash
cd /Users/sungjiwon/claude/2chi
git add apps/web/components/applications/application-card.tsx
git commit -m "feat: show stage history, result select, and next-stage prompt on ApplicationCard"
```

---

## Task 7: CalendarView 단계별 색상

**Files:**
- Modify: `apps/web/components/applications/calendar-view.tsx`

현재는 `appliedAt`만 캘린더 이벤트로 변환한다. 이제 각 stage의 `scheduledAt`도 단계별 색상으로 표시한다.

- [ ] **Step 1: `calendar-view.tsx`에서 applications.stages를 이벤트로 변환하는 로직 수정**

기존 `if (applications)` 블록(대략 94-127번째 줄)을 아래로 교체한다:

```tsx
  if (applications) {
    for (const app of applications) {
      const companyName = app.company?.name ?? app.memo ?? '지원';

      // 지원일 (appliedAt) 표시
      if (app.appliedAt) {
        const dateStr = app.appliedAt.slice(0, 10);
        const [y, m] = dateStr.split('-').map(Number);
        if (y === year && m === month) {
          allEvents.push({
            id: `app-applied-${app.id}`,
            title: `${companyName} 지원일`,
            date: dateStr,
            stageType: null,
            sourceId: app.id,
          });
        }
      }

      // 각 전형 단계의 scheduledAt 표시
      for (const stage of app.stages) {
        if (!stage.scheduledAt) continue;
        const dateStr = stage.scheduledAt.slice(0, 10);
        const [y, m] = dateStr.split('-').map(Number);
        if (y === year && m === month) {
          const stageName =
            stage.stage === 'CUSTOM'
              ? (stage.customLabel ?? '기타')
              : STAGE_LABELS[stage.stage];
          allEvents.push({
            id: `stage-${stage.id}`,
            title: `${companyName} ${stageName}`,
            date: dateStr,
            stageType: stage.stage,
            sourceId: app.id,
          });
        }
      }
    }
  }
```

- [ ] **Step 2: CalendarEvent 인터페이스에 `stageType` 추가, 색상 헬퍼 수정**

파일 상단의 `interface CalendarEvent`를 아래로 교체한다:

```tsx
import { STAGE_LABELS, STAGE_COLORS, type ApplicationStage } from '@2chi/shared';

// ... (기존 import 유지)

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  eventType?: 'DEADLINE' | 'INTERVIEW' | 'OTHER'; // CalendarEventDto에서 온 경우
  stageType?: ApplicationStage | null;             // Application stage에서 온 경우
  sourceId: string;
}
```

`getDotClass`, `getBadgeClass`, `getEventLabel` 함수를 아래로 교체한다:

```tsx
  function getDotClass(ev: CalendarEvent): string {
    if (ev.stageType) return STAGE_COLORS[ev.stageType]?.dot ?? 'bg-slate-400';
    if (ev.eventType === 'DEADLINE') return 'bg-red-500';
    if (ev.eventType === 'INTERVIEW') return 'bg-blue-500';
    return 'bg-slate-400';
  }

  function getBadgeClass(ev: CalendarEvent): string {
    if (ev.stageType) return STAGE_COLORS[ev.stageType]?.badge ?? 'bg-slate-100 text-slate-600';
    if (ev.eventType === 'DEADLINE') return 'bg-red-50 text-red-600';
    if (ev.eventType === 'INTERVIEW') return 'bg-blue-50 text-blue-700';
    return 'bg-slate-100 text-slate-600';
  }

  function getEventLabel(ev: CalendarEvent): string {
    if (ev.stageType) return STAGE_COLORS[ev.stageType]?.label ?? '기타';
    if (ev.eventType === 'DEADLINE') return '마감';
    if (ev.eventType === 'INTERVIEW') return '면접';
    return '기타';
  }
```

기존 CalendarEventDto에서 오는 이벤트 빌드 부분도 `stageType: undefined`를 명시하도록 수정:

```tsx
  if (calendarEvents) {
    for (const e of calendarEvents) {
      const dateStr = e.scheduledAt.slice(0, 10);
      allEvents.push({
        id: e.id,
        title: e.title,
        date: dateStr,
        eventType: e.eventType,
        stageType: undefined,
        sourceId: e.id,
      });
    }
  }
```

JSX에서 `getDotClass(ev.eventType)` → `getDotClass(ev)`, `getBadgeClass(ev.eventType)` → `getBadgeClass(ev)`, `getEventLabel(ev.eventType)` → `getEventLabel(ev)` 로 변경한다 (3곳 전부).

삭제 버튼 조건도 수정한다:
```tsx
{!ev.id.startsWith('stage-') && !ev.id.startsWith('app-applied-') && !ev.id.startsWith('app-deadline-') && (
```

- [ ] **Step 3: TypeScript 타입 확인**

```bash
cd /Users/sungjiwon/claude/2chi/apps/web
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 4: Commit**

```bash
cd /Users/sungjiwon/claude/2chi
git add apps/web/components/applications/calendar-view.tsx
git commit -m "feat: show application stage events with stage-specific colors on calendar"
```

---

## Self-Review

### Spec Coverage

| 요구사항 | 구현 위치 |
|----------|-----------|
| 서류 날짜 → 마감일 인식 | Task 3 (service: DOCUMENT+scheduledAt→DEADLINE 캘린더 이벤트), Task 6 (card: STAGE_DATE_LABELS['DOCUMENT']='마감일'), Task 7 (calendar: DOCUMENT→red) |
| 기타 직접 카테고리 입력 | Task 1 (DB: CUSTOM enum+customLabel), Task 2 (shared types), Task 3 (DTO+service), Task 5 (AddStageModal: CUSTOM→직접입력 필드) |
| 서류 외 마감일→면접일/응시일 | Task 2 (STAGE_DATE_LABELS 헬퍼), Task 5 (AddStageModal: 동적 레이블), Task 6 (card: stage별 dateLabel 표시) |
| 카테고리별 캘린더 색상 | Task 2 (STAGE_COLORS 헬퍼), Task 7 (CalendarView: stageType 기반 색상) |
| 각 전형 결과 표기 | Task 6 (ApplicationCard: 단계별 결과 뱃지 + StageResultSelect) |
| 합격 시 다음 일정 팝업 | Task 6 (ApplicationCard: showNextStagePrompt 팝업) |

### 타입 일관성 체크

- `ApplicationStage`에 `CUSTOM` 추가 → DTO enum validator, Prisma enum, shared type 모두 일치 ✓
- `STAGE_COLORS[stageType]` → 모든 7개 stage 값에 대해 정의됨 ✓
- `useUpdateStage(applicationId, stageId)` → controller `PATCH /:id/stages/:stageId` 매칭 ✓
- `stage.customLabel` → `ApplicationStageHistoryDto`에 추가됨 ✓
