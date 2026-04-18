# Step 2: experiences-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/ai/ai.service.ts`
- `apps/api/src/ai/ai.module.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`
- `apps/api/src/prisma/prisma.service.ts`
- `packages/shared/src/types/experience.ts`
- `packages/shared/src/schemas/experience.schema.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Experiences CRUD API와 AI STAR 변환 엔드포인트를 구현한다.

**CRITICAL:** 모든 API 응답은 `{ success: true, data }` / `{ success: false, error }` 형식을 따른다. 인증이 필요한 모든 API는 `Authorization: Bearer <token>` 헤더를 사용한다.

**생성할 파일:**
- `apps/api/src/experiences/dto/create-experience.dto.ts`
- `apps/api/src/experiences/dto/update-experience.dto.ts`
- `apps/api/src/experiences/experiences.service.ts`
- `apps/api/src/experiences/experiences.controller.ts`
- `apps/api/src/experiences/experiences.module.ts`
- `apps/api/test/experiences.e2e-spec.ts`

**수정할 파일:**
- `apps/api/src/app.module.ts`

### Step 1: 실패 테스트 작성

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

### Step 2: 테스트 실행 (실패 확인)

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/experiences.e2e-spec.ts --no-coverage 2>&1 | tail -5
```

Expected: `Cannot GET /experiences` 또는 모듈 없음으로 실패.

### Step 3: DTOs 구현

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

### Step 4: ExperiencesService 구현

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

### Step 5: ExperiencesController 구현

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

### Step 6: app.module.ts에 ExperiencesModule 추가

`apps/api/src/app.module.ts`의 `imports` 배열에 다음 추가:
```typescript
import { ExperiencesModule } from './experiences/experiences.module';

// imports 배열에 추가:
ExperiencesModule,
```

### Step 7: 테스트 실행 (통과 확인)

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/experiences.e2e-spec.ts --no-coverage
```

Expected: `5 passed`.

### Step 8: 커밋

```bash
git add apps/api/src/experiences apps/api/src/ai apps/api/src/app.module.ts apps/api/test/experiences.e2e-spec.ts
git commit -m "feat(api): add Experiences CRUD and AI STAR conversion endpoint"
```

## Acceptance Criteria

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/experiences.e2e-spec.ts --no-coverage
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/phase1-b-experience/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- Raw SQL 사용 금지. DB 쿼리는 모두 Prisma를 통해서만 한다
- 다른 유저의 이력을 조회·수정·삭제할 수 없도록 ForbiddenException 처리를 반드시 포함하라
