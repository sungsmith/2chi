# Step 3: cover-letters-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/ai/ai.service.ts`
- `apps/api/src/ai/ai.module.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/experiences/experiences.service.ts`
- `apps/api/src/experiences/experiences.module.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`
- `packages/shared/src/types/cover-letter.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

CoverLetters CRUD API와 SSE 스트리밍 초안 생성, AI 피드백 엔드포인트를 구현한다.

**CRITICAL:** 모든 API 응답은 `{ success: true, data }` / `{ success: false, error }` 형식을 따른다. SSE 스트리밍 엔드포인트(`POST /:id/items/:itemId/draft`)는 `text/event-stream` 헤더를 사용한다.

**생성할 파일:**
- `apps/api/src/cover-letters/dto/create-cover-letter.dto.ts`
- `apps/api/src/cover-letters/dto/update-cover-letter.dto.ts`
- `apps/api/src/cover-letters/dto/add-item.dto.ts`
- `apps/api/src/cover-letters/dto/update-item.dto.ts`
- `apps/api/src/cover-letters/cover-letters.service.ts`
- `apps/api/src/cover-letters/cover-letters.controller.ts`
- `apps/api/src/cover-letters/cover-letters.module.ts`
- `apps/api/test/cover-letters.e2e-spec.ts`

**수정할 파일:**
- `apps/api/src/app.module.ts`

### Step 1: 실패 테스트 작성

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

### Step 2: 테스트 실행 (실패 확인)

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/cover-letters.e2e-spec.ts --no-coverage 2>&1 | tail -5
```

Expected: `Cannot POST /cover-letters` 등으로 실패.

### Step 3: CoverLetter DTOs 구현

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

### Step 4: CoverLettersService 구현

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

### Step 5: CoverLettersController 구현

`apps/api/src/cover-letters/cover-letters.controller.ts`:
```typescript
import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  HttpCode, HttpStatus, Res
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

### Step 6: CoverLettersModule 구현

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

### Step 7: app.module.ts에 CoverLettersModule 추가

`apps/api/src/app.module.ts`의 imports 배열에 추가:
```typescript
import { CoverLettersModule } from './cover-letters/cover-letters.module';

// imports 배열에 추가:
CoverLettersModule,
```

### Step 8: 테스트 실행 (통과 확인)

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/cover-letters.e2e-spec.ts --no-coverage
```

Expected: `5 passed`.

### Step 9: 커밋

```bash
git add apps/api/src/cover-letters apps/api/src/app.module.ts apps/api/test/cover-letters.e2e-spec.ts
git commit -m "feat(api): add CoverLetters CRUD, SSE draft streaming, and AI feedback"
```

## Acceptance Criteria

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/cover-letters.e2e-spec.ts --no-coverage
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/phase1-c-cover-letter/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- Raw SQL 사용 금지. DB 쿼리는 모두 Prisma를 통해서만 한다
- 다른 유저의 자소서를 조회·수정·삭제할 수 없도록 ForbiddenException 처리를 반드시 포함하라
- SSE 스트리밍 엔드포인트(`/draft`)는 `text/event-stream` Content-Type을 사용해야 한다
