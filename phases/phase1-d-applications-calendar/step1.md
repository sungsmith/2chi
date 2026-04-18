# Step 1: applications-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/app.module.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`
- `apps/api/src/prisma/prisma.service.ts`
- `packages/shared/src/types/application.ts`
- `packages/shared/src/schemas/application.schema.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Applications CRUD API와 전형 단계 히스토리 관리를 구현한다. 지원 추가 시 채용공고 마감일이 있으면 CalendarEvent를 자동으로 생성한다. 면접 단계 추가 시에도 CalendarEvent를 자동 생성한다.

**생성할 파일:**
- `apps/api/src/applications/dto/create-application.dto.ts`
- `apps/api/src/applications/dto/update-application.dto.ts`
- `apps/api/src/applications/dto/add-stage.dto.ts`
- `apps/api/src/applications/applications.service.ts`
- `apps/api/src/applications/applications.controller.ts`
- `apps/api/src/applications/applications.module.ts`
- `apps/api/test/applications.e2e-spec.ts`

**수정할 파일:**
- `apps/api/src/app.module.ts`

### Step 1: 실패 테스트 작성

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

### Step 2: 테스트 실행 (실패 확인)

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/applications.e2e-spec.ts --no-coverage 2>&1 | tail -5
```

Expected: `Cannot POST /applications` 등으로 실패.

### Step 3: DTOs 구현

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

### Step 4: ApplicationsService 구현

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

### Step 5: ApplicationsController 구현

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

### Step 6: ApplicationsModule 구현

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

### Step 7: app.module.ts에 ApplicationsModule 추가

`apps/api/src/app.module.ts`의 imports 배열에 추가:
```typescript
import { ApplicationsModule } from './applications/applications.module';

// imports 배열에 추가:
ApplicationsModule,
```

### Step 8: 테스트 실행 (통과 확인)

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/applications.e2e-spec.ts --no-coverage
```

Expected: `5 passed`.

### Step 9: 커밋

```bash
git add apps/api/src/applications apps/api/src/app.module.ts apps/api/test/applications.e2e-spec.ts
git commit -m "feat(api): add Applications CRUD with stage history and auto CalendarEvent"
```

## Acceptance Criteria

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/applications.e2e-spec.ts --no-coverage
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/phase1-d-applications-calendar/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- Raw SQL 사용 금지. DB 쿼리는 모두 Prisma를 통해서만 한다
- 다른 유저의 지원 정보를 조회·수정·삭제할 수 없도록 ForbiddenException 처리를 반드시 포함하라
- 지원 생성 시 jobPosting.deadline이 있으면 CalendarEvent(DEADLINE)를 반드시 자동 생성하라
- 면접 단계(FIRST_INTERVIEW, SECOND_INTERVIEW, FINAL_INTERVIEW) 추가 시 scheduledAt이 있으면 CalendarEvent(INTERVIEW)를 반드시 자동 생성하라
