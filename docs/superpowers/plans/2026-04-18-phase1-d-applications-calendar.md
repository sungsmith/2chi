# Phase 1-D: 지원 현황 + 캘린더 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지원 현황(단계별 카드 보드)과 캘린더(마감일·면접 일정) 기능을 API와 UI 모두 완성한다. 지원 추가 시 CalendarEvent가 자동 생성된다.

**Architecture:** Applications(CRUD + 단계 히스토리) → Calendar(CRUD, Application과 연결)로 구성. 프론트는 지원 현황은 컬럼 보드 형태, 캘린더는 단순 월별 리스트로 표시한다.

**Tech Stack:** NestJS, Prisma, Next.js 14, TanStack Query

**Prerequisite:** Plan A + Plan B + Plan C 완료 필요.

---

## 파일 구조

```
packages/shared/src/
  types/application.ts
  schemas/application.schema.ts
  (index.ts에 re-export 추가)

apps/api/src/
  applications/
    applications.module.ts
    applications.controller.ts
    applications.service.ts
    dto/
      create-application.dto.ts
      update-application.dto.ts
      add-stage.dto.ts
  calendar/
    calendar.module.ts
    calendar.controller.ts
    calendar.service.ts
    dto/
      create-event.dto.ts
      update-event.dto.ts
  app.module.ts   (ApplicationsModule, CalendarModule 추가)

apps/api/test/
  applications.e2e-spec.ts

apps/web/
  app/applications/
    page.tsx             # 지원 현황 보드 + 캘린더 탭
  components/applications/
    application-board.tsx
    application-card.tsx
    add-application-modal.tsx
    calendar-view.tsx
  hooks/
    use-applications.ts
    use-calendar.ts
```

---

### Task 1: 공유 Application 타입 추가

**Files:**
- Create: `packages/shared/src/types/application.ts`
- Create: `packages/shared/src/schemas/application.schema.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: application 타입 작성**

`packages/shared/src/types/application.ts`:
```typescript
export type ApplicationStage =
  | 'DOCUMENT'
  | 'FIRST_INTERVIEW'
  | 'SECOND_INTERVIEW'
  | 'FINAL_INTERVIEW'
  | 'OFFER'
  | 'DONE';

export type ApplicationResult = 'PASS' | 'FAIL' | 'PENDING' | 'WITHDRAWN';
export type EventType = 'DEADLINE' | 'INTERVIEW' | 'OTHER';

export interface ApplicationStageHistoryDto {
  id: string;
  applicationId: string;
  stage: ApplicationStage;
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
```

- [ ] **Step 2: application Zod 스키마 작성**

`packages/shared/src/schemas/application.schema.ts`:
```typescript
import { z } from 'zod';

export const createApplicationSchema = z.object({
  jobPostingId: z.string().optional(),
  companyId: z.string().optional(),
  coverLetterId: z.string().optional(),
  appliedAt: z.string().optional(),
  currentStage: z
    .enum(['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW', 'OFFER', 'DONE'])
    .optional()
    .default('DOCUMENT'),
  memo: z.string().max(2000).optional(),
});

export const addStageSchema = z.object({
  stage: z.enum(['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW', 'OFFER', 'DONE']),
  scheduledAt: z.string().optional(),
  result: z.enum(['PASS', 'FAIL', 'PENDING', 'WITHDRAWN']).optional(),
  note: z.string().max(500).optional(),
});

export const createCalendarEventSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(100),
  eventType: z.enum(['DEADLINE', 'INTERVIEW', 'OTHER']),
  scheduledAt: z.string().min(1, '일정 날짜를 입력하세요.'),
  applicationId: z.string().optional(),
  reminderAt: z.string().optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type AddStageInput = z.infer<typeof addStageSchema>;
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
```

- [ ] **Step 3: index.ts에 re-export 추가**

`packages/shared/src/index.ts`에 추가:
```typescript
export * from './types/application';
export * from './schemas/application.schema';
```

- [ ] **Step 4: 타입 체크**

```bash
cd packages/shared && pnpm build
```

Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/types/application.ts packages/shared/src/schemas/application.schema.ts packages/shared/src/index.ts
git commit -m "feat(shared): add Application and CalendarEvent types and schemas"
```

---

### Task 2: Applications API

**Files:**
- Create: `apps/api/src/applications/dto/create-application.dto.ts`
- Create: `apps/api/src/applications/dto/update-application.dto.ts`
- Create: `apps/api/src/applications/dto/add-stage.dto.ts`
- Create: `apps/api/src/applications/applications.service.ts`
- Create: `apps/api/src/applications/applications.controller.ts`
- Create: `apps/api/src/applications/applications.module.ts`

- [ ] **Step 1: 실패 테스트 작성**

`apps/api/test/applications.e2e-spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Applications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let appId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = moduleRef.get(PrismaService);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'e2e-app@example.com', password: 'password123', name: '지원테스터', jobType: 'NEW_GRAD' });
    accessToken = res.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'e2e-app@example.com' } });
    await app.close();
  });

  describe('POST /applications', () => {
    it('should create an application', async () => {
      const res = await request(app.getHttpServer())
        .post('/applications')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ appliedAt: '2026-04-18', currentStage: 'DOCUMENT', memo: '서류 제출 완료' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.currentStage).toBe('DOCUMENT');
      appId = res.body.data.id;
    });
  });

  describe('GET /applications', () => {
    it('should return list', async () => {
      const res = await request(app.getHttpServer())
        .get('/applications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('PATCH /applications/:id', () => {
    it('should update stage', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/applications/${appId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentStage: 'FIRST_INTERVIEW' })
        .expect(200);

      expect(res.body.data.currentStage).toBe('FIRST_INTERVIEW');
    });
  });

  describe('POST /applications/:id/stages', () => {
    it('should add stage history', async () => {
      const res = await request(app.getHttpServer())
        .post(`/applications/${appId}/stages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ stage: 'FIRST_INTERVIEW', scheduledAt: '2026-04-25', note: '1차 면접' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe('FIRST_INTERVIEW');
    });
  });

  describe('DELETE /applications/:id', () => {
    it('should delete', async () => {
      await request(app.getHttpServer())
        .delete(`/applications/${appId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/applications.e2e-spec.ts --no-coverage 2>&1 | tail -5
```

Expected: `Cannot POST /applications` 등으로 실패.

- [ ] **Step 3: DTOs 구현**

`apps/api/src/applications/dto/create-application.dto.ts`:
```typescript
import { IsString, IsOptional, IsEnum, IsDateString, MaxLength } from 'class-validator';

export class CreateApplicationDto {
  @IsOptional()
  @IsString()
  jobPostingId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  coverLetterId?: string;

  @IsOptional()
  @IsDateString()
  appliedAt?: string;

  @IsOptional()
  @IsEnum(['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW', 'OFFER', 'DONE'])
  currentStage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  memo?: string;
}
```

`apps/api/src/applications/dto/update-application.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateApplicationDto } from './create-application.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {
  @IsOptional()
  @IsEnum(['PASS', 'FAIL', 'PENDING', 'WITHDRAWN'])
  result?: string;
}
```

`apps/api/src/applications/dto/add-stage.dto.ts`:
```typescript
import { IsEnum, IsOptional, IsDateString, IsString, MaxLength } from 'class-validator';

export class AddStageDto {
  @IsEnum(['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW', 'OFFER', 'DONE'])
  stage: string;

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

- [ ] **Step 4: ApplicationsService 구현**

`apps/api/src/applications/applications.service.ts`:
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AddStageDto } from './dto/add-stage.dto';
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
    const { appliedAt, currentStage, result, ...rest } = dto;
    const app = await this.prisma.application.create({
      data: {
        ...rest,
        userId,
        appliedAt: appliedAt ? new Date(appliedAt) : undefined,
        currentStage: (currentStage ?? 'DOCUMENT') as ApplicationStage,
        result: result as ApplicationResult | undefined,
      },
      include: {
        stages: true,
        company: { select: { id: true, name: true } },
        jobPosting: { select: { id: true, title: true, deadline: true } },
      },
    });

    // 마감일이 있으면 CalendarEvent 자동 생성
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
    await this.findOne(applicationId, userId);
    const { stage, scheduledAt, result, note } = dto;

    const stageHistory = await this.prisma.applicationStageHistory.create({
      data: {
        applicationId,
        stage: stage as ApplicationStage,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        result: result as ApplicationResult | undefined,
        note,
      },
    });

    // 면접 일정이 있으면 CalendarEvent 생성
    if (scheduledAt && (stage === 'FIRST_INTERVIEW' || stage === 'SECOND_INTERVIEW' || stage === 'FINAL_INTERVIEW')) {
      const app = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: { jobPosting: true },
      });
      const stageLabel = { FIRST_INTERVIEW: '1차', SECOND_INTERVIEW: '2차', FINAL_INTERVIEW: '최종' }[stage] || '';
      await this.prisma.calendarEvent.create({
        data: {
          userId,
          applicationId,
          title: `[면접] ${app?.jobPosting?.title ?? '면접'} ${stageLabel}`,
          eventType: 'INTERVIEW',
          scheduledAt: new Date(scheduledAt),
        },
      });
    }

    return stageHistory;
  }
}
```

`apps/api/src/applications/applications.controller.ts`:
```typescript
import {
  Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AddStageDto } from './dto/add-stage.dto';
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
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.applicationsService.remove(id, user.sub);
    return { success: true, data: null };
  }

  @Post(':id/stages')
  async addStage(
    @Param('id') id: string,
    @Body() dto: AddStageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.applicationsService.addStage(id, user.sub, dto);
    return { success: true, data };
  }
}
```

`apps/api/src/applications/applications.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';

@Module({
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}
```

- [ ] **Step 5: app.module.ts에 ApplicationsModule 추가**

`apps/api/src/app.module.ts`:
```typescript
import { ApplicationsModule } from './applications/applications.module';
// imports 배열에 추가:
ApplicationsModule,
```

- [ ] **Step 6: 테스트 실행 (통과 확인)**

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/applications.e2e-spec.ts --no-coverage
```

Expected: `5 passed`.

- [ ] **Step 7: 커밋**

```bash
git add apps/api/src/applications apps/api/src/app.module.ts apps/api/test/applications.e2e-spec.ts
git commit -m "feat(api): add Applications CRUD with stage history and auto CalendarEvent"
```

---

### Task 3: Calendar API

**Files:**
- Create: `apps/api/src/calendar/dto/create-event.dto.ts`
- Create: `apps/api/src/calendar/dto/update-event.dto.ts`
- Create: `apps/api/src/calendar/calendar.service.ts`
- Create: `apps/api/src/calendar/calendar.controller.ts`
- Create: `apps/api/src/calendar/calendar.module.ts`

- [ ] **Step 1: Calendar DTOs 구현**

`apps/api/src/calendar/dto/create-event.dto.ts`:
```typescript
import { IsString, IsEnum, IsDateString, IsOptional, MaxLength } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsEnum(['DEADLINE', 'INTERVIEW', 'OTHER'])
  eventType: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsDateString()
  reminderAt?: string;
}
```

`apps/api/src/calendar/dto/update-event.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {}
```

- [ ] **Step 2: CalendarService 구현**

`apps/api/src/calendar/calendar.service.ts`:
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventType } from '@prisma/client';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async findByMonth(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    return this.prisma.calendarEvent.findMany({
      where: {
        userId,
        scheduledAt: { gte: start, lte: end },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateEventDto) {
    return this.prisma.calendarEvent.create({
      data: {
        userId,
        title: dto.title,
        eventType: dto.eventType as EventType,
        scheduledAt: new Date(dto.scheduledAt),
        applicationId: dto.applicationId,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateEventDto) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('일정을 찾을 수 없습니다.');
    if (event.userId !== userId) throw new ForbiddenException();

    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        title: dto.title,
        eventType: dto.eventType as EventType | undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('일정을 찾을 수 없습니다.');
    if (event.userId !== userId) throw new ForbiddenException();
    return this.prisma.calendarEvent.delete({ where: { id } });
  }
}
```

`apps/api/src/calendar/calendar.controller.ts`:
```typescript
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get()
  async findByMonth(
    @CurrentUser() user: JwtPayload,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    const data = await this.calendarService.findByMonth(user.sub, y, m);
    return { success: true, data };
  }

  @Post()
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: JwtPayload) {
    const data = await this.calendarService.create(user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.calendarService.update(id, user.sub, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.calendarService.remove(id, user.sub);
    return { success: true, data: null };
  }
}
```

`apps/api/src/calendar/calendar.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';

@Module({
  providers: [CalendarService],
  controllers: [CalendarController],
})
export class CalendarModule {}
```

- [ ] **Step 3: app.module.ts에 CalendarModule 추가**

`apps/api/src/app.module.ts`:
```typescript
import { CalendarModule } from './calendar/calendar.module';
// imports 배열에 추가:
CalendarModule,
```

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/calendar apps/api/src/app.module.ts
git commit -m "feat(api): add Calendar CRUD module"
```

---

### Task 4: Applications + Calendar 훅

**Files:**
- Create: `apps/web/hooks/use-applications.ts`
- Create: `apps/web/hooks/use-calendar.ts`

- [ ] **Step 1: use-applications.ts 구현**

`apps/web/hooks/use-applications.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ApplicationDto, ApplicationStageHistoryDto,
  CreateApplicationInput, AddStageInput
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
```

- [ ] **Step 2: use-calendar.ts 구현**

`apps/web/hooks/use-calendar.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CalendarEventDto, CreateCalendarEventInput } from '@2chi/shared';

export function useCalendarEvents(year: number, month: number) {
  return useQuery({
    queryKey: ['calendar', year, month],
    queryFn: async () => {
      const res = await api.get<CalendarEventDto[]>(`/calendar?year=${year}&month=${month}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCalendarEventInput) => api.post<CalendarEventDto>('/calendar', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/calendar/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  });
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/web/hooks/use-applications.ts apps/web/hooks/use-calendar.ts
git commit -m "feat(web): add applications and calendar query hooks"
```

---

### Task 5: Applications UI (보드 뷰)

**Files:**
- Create: `apps/web/components/applications/application-card.tsx`
- Create: `apps/web/components/applications/application-board.tsx`
- Create: `apps/web/components/applications/add-application-modal.tsx`

- [ ] **Step 1: ApplicationCard 구현**

`apps/web/components/applications/application-card.tsx`:
```typescript
'use client';

import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeleteApplication } from '@/hooks/use-applications';
import type { ApplicationDto } from '@2chi/shared';

const RESULT_CONFIG = {
  PASS: { label: '합격', className: 'text-green-600 bg-green-50' },
  FAIL: { label: '불합격', className: 'text-red-500 bg-red-50' },
  PENDING: { label: '대기', className: 'text-amber-600 bg-amber-50' },
  WITHDRAWN: { label: '포기', className: 'text-slate-500 bg-slate-100' },
} as const;

export function ApplicationCard({ application }: { application: ApplicationDto }) {
  const delete_ = useDeleteApplication();
  const result = application.result ? RESULT_CONFIG[application.result] : null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {application.company?.name ?? application.jobPosting?.title ?? '(미입력)'}
          </p>
          {application.jobPosting && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{application.jobPosting.title}</p>
          )}
          {application.appliedAt && (
            <p className="text-xs text-slate-400 mt-1">
              지원일: {new Date(application.appliedAt).toLocaleDateString('ko-KR')}
            </p>
          )}
          {application.jobPosting?.deadline && (
            <p className="text-xs text-slate-400">
              마감: {new Date(application.jobPosting.deadline).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            if (confirm('이 지원 현황을 삭제할까요?')) delete_.mutate(application.id);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {result && (
        <span className={cn('inline-block mt-2 rounded-full text-xs font-medium px-2.5 py-0.5', result.className)}>
          {result.label}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: AddApplicationModal 구현**

`apps/web/components/applications/add-application-modal.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateApplication } from '@/hooks/use-applications';
import { useJobPostings } from '@/hooks/use-job-postings';
import { createApplicationSchema, type CreateApplicationInput } from '@2chi/shared';

interface Props {
  onClose: () => void;
}

export function AddApplicationModal({ onClose }: Props) {
  const create = useCreateApplication();
  const { data: jobPostings } = useJobPostings();

  const { register, handleSubmit } = useForm<CreateApplicationInput>({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: { currentStage: 'DOCUMENT' },
  });

  const onSubmit = async (data: CreateApplicationInput) => {
    const res = await create.mutateAsync(data);
    if (res.success) onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">지원 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {jobPostings && jobPostings.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="jobPostingId">연결된 채용공고 (선택)</Label>
              <select
                id="jobPostingId"
                {...register('jobPostingId')}
                className="w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택 안함</option>
                {jobPostings.map((jp) => (
                  <option key={jp.id} value={jp.id}>{jp.title}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="appliedAt">지원일 (선택)</Label>
            <Input id="appliedAt" type="date" {...register('appliedAt')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currentStage">현재 단계</Label>
            <select
              id="currentStage"
              {...register('currentStage')}
              className="w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DOCUMENT">서류</option>
              <option value="FIRST_INTERVIEW">1차 면접</option>
              <option value="SECOND_INTERVIEW">2차 면접</option>
              <option value="FINAL_INTERVIEW">최종 면접</option>
              <option value="OFFER">오퍼</option>
              <option value="DONE">완료</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={create.isPending} className="flex-1">
              {create.isPending ? '추가 중...' : '추가'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: ApplicationBoard 구현**

`apps/web/components/applications/application-board.tsx`:
```typescript
'use client';

import { ApplicationCard } from './application-card';
import type { ApplicationDto, ApplicationStage } from '@2chi/shared';

const STAGE_COLUMNS: { key: ApplicationStage; label: string }[] = [
  { key: 'DOCUMENT', label: '서류' },
  { key: 'FIRST_INTERVIEW', label: '1차 면접' },
  { key: 'SECOND_INTERVIEW', label: '2차 면접' },
  { key: 'FINAL_INTERVIEW', label: '최종 면접' },
  { key: 'OFFER', label: '오퍼' },
  { key: 'DONE', label: '완료' },
];

interface Props {
  applications: ApplicationDto[];
}

export function ApplicationBoard({ applications }: Props) {
  const byStage = STAGE_COLUMNS.reduce<Record<string, ApplicationDto[]>>(
    (acc, { key }) => {
      acc[key] = applications.filter((a) => a.currentStage === key);
      return acc;
    },
    {},
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGE_COLUMNS.map(({ key, label }) => (
        <div key={key} className="flex-none w-56">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
            <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
              {byStage[key].length}
            </span>
          </div>
          <div className="space-y-2 min-h-16">
            {byStage[key].map((app) => (
              <ApplicationCard key={app.id} application={app} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 커밋**

```bash
git add apps/web/components/applications
git commit -m "feat(web): add application board, card, and add-application modal"
```

---

### Task 6: Calendar UI + 메인 페이지

**Files:**
- Create: `apps/web/components/applications/calendar-view.tsx`
- Create: `apps/web/app/applications/page.tsx`

- [ ] **Step 1: CalendarView 구현**

`apps/web/components/applications/calendar-view.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCalendarEvents, useDeleteCalendarEvent } from '@/hooks/use-calendar';
import { cn } from '@/lib/utils';

const EVENT_TYPE_CONFIG = {
  DEADLINE: { label: '마감', className: 'bg-red-50 text-red-600' },
  INTERVIEW: { label: '면접', className: 'bg-blue-50 text-blue-700' },
  OTHER: { label: '기타', className: 'bg-slate-100 text-slate-600' },
} as const;

export function CalendarView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const { data: events, isLoading } = useCalendarEvents(year, month);
  const deleteEvent = useDeleteCalendarEvent();

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={prevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-lg font-semibold text-slate-900">
          {year}년 {month}월
        </span>
        <Button variant="ghost" size="sm" onClick={nextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {events?.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">이번 달 일정이 없습니다.</p>
        </div>
      )}

      <div className="space-y-2">
        {events?.map((event) => {
          const config = EVENT_TYPE_CONFIG[event.eventType];
          return (
            <div
              key={event.id}
              className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-3 shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <span className={cn('rounded-full text-xs font-medium px-2.5 py-0.5', config.className)}>
                  {config.label}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{event.title}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(event.scheduledAt).toLocaleDateString('ko-KR', {
                      month: 'long', day: 'numeric', weekday: 'short'
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteEvent.mutate(event.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Applications 메인 페이지 구현 (탭: 보드 | 캘린더)**

`apps/web/app/applications/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApplicationBoard } from '@/components/applications/application-board';
import { CalendarView } from '@/components/applications/calendar-view';
import { AddApplicationModal } from '@/components/applications/add-application-modal';
import { useApplications } from '@/hooks/use-applications';
import { cn } from '@/lib/utils';

type Tab = 'board' | 'calendar';

export default function ApplicationsPage() {
  const [tab, setTab] = useState<Tab>('board');
  const [showModal, setShowModal] = useState(false);
  const { data: applications, isLoading } = useApplications();

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">지원 현황</h1>
          <p className="text-sm text-slate-500 mt-0.5">지원 단계와 일정을 관리하세요.</p>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4" />
          지원 추가
        </Button>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {(['board', 'calendar'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t === 'board' ? '보드' : '캘린더'}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {tab === 'board' && applications && (
        <ApplicationBoard applications={applications} />
      )}

      {tab === 'calendar' && <CalendarView />}

      {showModal && <AddApplicationModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
```

- [ ] **Step 3: 개발 서버에서 전체 플로우 확인**

```bash
pnpm dev
```

확인 시나리오:
1. `/applications` → 보드 탭 (빈 상태)
2. "지원 추가" → 모달 → 지원 추가 → 보드에 카드 등장
3. 캘린더 탭 → 이번 달 일정 표시
4. 채용공고 마감일이 있는 경우 자동으로 캘린더에 등록됨 확인

- [ ] **Step 4: 커밋**

```bash
git add apps/web/components/applications/calendar-view.tsx apps/web/app/applications
git commit -m "feat(web): add applications board and calendar view with add modal"
```

---

### Task 7: 대시보드 통계 연결

**Files:**
- Modify: `apps/web/app/(dashboard)/page.tsx`

- [ ] **Step 1: 대시보드 페이지를 실제 데이터로 업데이트**

`apps/web/app/(dashboard)/page.tsx`를 다음으로 교체:
```typescript
'use client';

import { useExperiences } from '@/hooks/use-experiences';
import { useCoverLetters } from '@/hooks/use-cover-letters';
import { useApplications } from '@/hooks/use-applications';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: experiences } = useExperiences();
  const { data: coverLetters } = useCoverLetters();
  const { data: applications } = useApplications();

  const activeApplications = applications?.filter(
    (a) => a.currentStage !== 'DONE' && a.result !== 'FAIL' && a.result !== 'WITHDRAWN',
  ).length ?? 0;

  const stats = [
    { label: '내 이력', value: experiences?.length ?? '—', href: '/experience' },
    { label: '자소서', value: coverLetters?.length ?? '—', href: '/cover-letter' },
    { label: '진행 중인 지원', value: activeApplications || (applications !== undefined ? 0 : '—'), href: '/applications' },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">대시보드</h1>
      <p className="text-sm text-slate-500 mb-8">취업 준비 현황을 한눈에 확인하세요.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, href }) => (
          <Link key={label} href={href}>
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-semibold text-slate-900 mt-2">{value}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add "apps/web/app/(dashboard)/page.tsx"
git commit -m "feat(web): connect dashboard stats to real data"
```

---

### Task 8: 전체 Phase 1 최종 검증

- [ ] **Step 1: API 전체 테스트 실행**

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json --no-coverage
```

Expected: 모든 테스트 통과 (auth, experiences, cover-letters, applications).

- [ ] **Step 2: 웹 테스트 실행**

```bash
cd apps/web && pnpm test
```

Expected: 모든 테스트 통과.

- [ ] **Step 3: 타입 체크**

```bash
cd packages/shared && pnpm build
cd ../api && pnpm lint
cd ../web && pnpm lint
```

Expected: 에러 없음.

- [ ] **Step 4: 개발 서버 전체 플로우 최종 확인**

```bash
docker-compose up -d db redis
pnpm dev
```

황금 경로 (Golden Path) 확인:
1. 회원가입 → 대시보드
2. 이력 추가 (STAR 작성) → AI STAR 변환 테스트
3. 채용공고 붙여넣기 → 자소서 생성 → 항목 추가 → AI 초안 스트리밍 → 피드백
4. 지원 추가 → 보드에 카드 → 캘린더에 마감일 자동 등록
5. 로그아웃 → 재로그인

- [ ] **Step 5: 최종 커밋**

```bash
git add .
git commit -m "feat: complete Phase 1 MVP - auth, experience, cover letter, applications, calendar"
```

---

## Self-Review

### Spec Coverage 체크

| Phase 1-D 요구사항 | 구현 태스크 |
|---|---|
| 지원 CRUD | Task 2 |
| 전형 단계 히스토리 | Task 2 (addStage) |
| 면접 시 캘린더 자동 등록 | Task 2 (addStage 로직) |
| 마감일 캘린더 자동 등록 | Task 2 (create 로직) |
| 캘린더 월별 조회 | Task 3 |
| 캘린더 CRUD | Task 3 |
| E2E 테스트 (applications) | Task 2 |
| 지원 보드 UI | Task 5 (ApplicationBoard) |
| 지원 추가 모달 | Task 5 (AddApplicationModal) |
| 캘린더 UI | Task 6 |
| 대시보드 통계 연결 | Task 7 |

### Placeholder 검사
없음.

### 타입 일관성
- `ApplicationStage`, `ApplicationResult`, `EventType` → packages/shared에서 string literal union으로 정의, Prisma enum과 일치
- `byStage[key]` → `Record<string, ApplicationDto[]>` — TS에서 `ApplicationStage`를 인덱스로 직접 쓰면 타입 에러 가능하므로 `string` 키를 사용
- `addStage` 시 CalendarEvent 생성 조건: `FIRST_INTERVIEW | SECOND_INTERVIEW | FINAL_INTERVIEW`만 해당
