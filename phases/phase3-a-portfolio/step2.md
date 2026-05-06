# Step 2: portfolio-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/apps/api/src/career-descriptions/career-descriptions.controller.ts` — 컨트롤러 패턴
- `/apps/api/src/career-descriptions/career-descriptions.service.ts` — 서비스 패턴
- `/apps/api/src/career-descriptions/career-descriptions.module.ts` — 모듈 패턴
- `/apps/api/src/career-descriptions/dto/` — DTO 패턴
- `/apps/api/src/career-descriptions/templates/` — PDF 템플릿 패턴
- `/apps/api/src/files/files.service.ts` — PDF 업로드 패턴
- `/apps/api/src/ai/ai.service.ts` — streamPortfolioSectionDraft 메서드 확인
- `/packages/shared/src/types/portfolio.ts` — Step 0에서 생성한 타입
- `/packages/shared/src/schemas/portfolio.schema.ts` — Step 0에서 생성한 스키마
- `/apps/api/prisma/schema.prisma` — Portfolio, PortfolioSection 모델

이전 steps 완료 summary:
- Step 0: PortfolioDto, PortfolioSectionDto 타입 및 Zod 스키마 packages/shared에 추가
- Step 1: portfolio.prompt.ts 생성, AiService에 streamPortfolioSectionDraft 메서드 추가

## 작업

포트폴리오 NestJS 모듈을 생성한다. CRUD, 섹션 관리, AI 초안 스트리밍, PDF 생성을 구현한다.

### 생성할 파일

**`apps/api/src/portfolios/dto/create-portfolio.dto.ts`**
**`apps/api/src/portfolios/dto/update-portfolio.dto.ts`**
**`apps/api/src/portfolios/dto/create-portfolio-section.dto.ts`**
**`apps/api/src/portfolios/dto/update-portfolio-section.dto.ts`**

class-validator 기반 DTO. `packages/shared`의 Zod 스키마와 동일한 제약 조건을 적용한다.

**`apps/api/src/portfolios/templates/portfolio.template.hbs`**

Handlebars 기반 HTML 템플릿. `career-descriptions/templates/` 패턴과 동일하게 작성한다. 섹션을 순서대로 렌더링하며, 타입에 따라 다른 스타일을 적용한다.

**`apps/api/src/portfolios/portfolios.service.ts`**

아래 메서드 시그니처를 구현한다:

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { FilesService } from '../files/files.service';
import { PortfolioDto, PortfolioSectionDto } from '@2chi/shared';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { CreatePortfolioSectionDto } from './dto/create-portfolio-section.dto';
import { UpdatePortfolioSectionDto } from './dto/update-portfolio-section.dto';

@Injectable()
export class PortfoliosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly files: FilesService,
  ) {}

  async findAll(userId: string): Promise<PortfolioDto[]>
  async findOne(id: string, userId: string): Promise<PortfolioDto>
  async create(userId: string, dto: CreatePortfolioDto): Promise<PortfolioDto>
  async update(id: string, userId: string, dto: UpdatePortfolioDto): Promise<PortfolioDto>
  async remove(id: string, userId: string): Promise<void>

  // 섹션 관리
  async createSection(portfolioId: string, userId: string, dto: CreatePortfolioSectionDto): Promise<PortfolioSectionDto>
  async updateSection(portfolioId: string, sectionId: string, userId: string, dto: UpdatePortfolioSectionDto): Promise<PortfolioSectionDto>
  async removeSection(portfolioId: string, sectionId: string, userId: string): Promise<void>
  async reorderSections(portfolioId: string, userId: string, sectionIds: string[]): Promise<void>

  // AI + PDF
  async streamSectionDraft(portfolioId: string, sectionId: string, userId: string, res: Response): Promise<void>
  async generatePdf(portfolioId: string, userId: string): Promise<string>  // Signed URL 반환
}
```

핵심 규칙:
- 모든 메서드에서 `userId` 검증 필수. 다른 사용자의 포트폴리오 접근 시 `ForbiddenException` throw
- `generatePdf`는 Puppeteer로 HTML 렌더링 후 R2에 업로드, Signed URL 반환 (FilesService 사용)
- `streamSectionDraft`는 해당 포트폴리오의 모든 Experience를 DB에서 조회하여 AiService.streamPortfolioSectionDraft에 전달
- `streamSectionDraft`는 SSE 헤더를 직접 설정하고 `res` 객체에 write

**`apps/api/src/portfolios/portfolios.controller.ts`**

```typescript
import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, Req, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('portfolios')
@UseGuards(JwtAuthGuard)
export class PortfoliosController {
  @Get()           // 목록 조회
  @Get(':id')      // 단건 조회
  @Post()          // 생성
  @Patch(':id')    // 수정
  @Delete(':id')   // 삭제

  @Post(':id/sections')                           // 섹션 추가
  @Patch(':id/sections/:sectionId')               // 섹션 수정
  @Delete(':id/sections/:sectionId')              // 섹션 삭제
  @Put(':id/sections/reorder')                    // 섹션 순서 변경 (body: { sectionIds: string[] })

  @Post(':id/sections/:sectionId/draft')          // AI 초안 스트리밍 (SSE)
  @Post(':id/pdf')                                // PDF 생성 → { url: string } 반환
}
```

모든 응답은 `{ success: true, data: T }` 형식을 따른다. SSE 엔드포인트는 제외.

**`apps/api/src/portfolios/portfolios.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';
import { ExperiencesModule } from '../experiences/experiences.module';
import { PortfoliosController } from './portfolios.controller';
import { PortfoliosService } from './portfolios.service';

@Module({
  imports: [PrismaModule, AiModule, FilesModule, ExperiencesModule],
  controllers: [PortfoliosController],
  providers: [PortfoliosService],
})
export class PortfoliosModule {}
```

### 수정할 파일

**`apps/api/src/app.module.ts`**

`PortfoliosModule` import 추가.

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
cd apps/api && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - 모든 엔드포인트에서 userId 검증이 이루어지는가?
   - `ForbiddenException`이 잘못된 접근에 throw되는가?
   - PDF 생성이 R2에 업로드하고 Signed URL을 반환하는가?
   - `app.module.ts`에 `PortfoliosModule`이 추가되었는가?
3. 성공 시 `phases/phase3-a-portfolio/index.json`의 step 2를 업데이트한다:
   - `"status": "completed"`, `"summary": "portfolios NestJS 모듈 생성 — CRUD, 섹션 관리, AI SSE 스트리밍, PDF 생성 포함"`

## 금지사항

- 파일을 디스크에 임시 저장하지 마라. 이유: 서버리스 환경에서 파일 시스템 접근이 불안정하다. Buffer로 처리 후 바로 R2 업로드.
- Raw SQL을 사용하지 마라. 이유: 모든 DB 쿼리는 Prisma를 통해야 한다.
- `ExperiencesModule`을 재구현하지 마라. 이유: 이미 구현되어 있으므로 import만 추가한다.
- `experiences.module.ts`에 exports가 없다면 추가해야 ExperiencesModule을 다른 모듈에서 사용할 수 있다.
