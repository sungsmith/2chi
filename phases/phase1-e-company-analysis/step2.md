# Step 2: companies-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/ai/ai.service.ts`
- `apps/api/src/ai/ai.module.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`
- `packages/shared/src/types/company.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Companies API를 구현한다. 기업 분석 결과는 24시간 동안 캐싱된다.

**생성할 파일:**
- `apps/api/src/companies/dto/create-company.dto.ts`
- `apps/api/src/companies/dto/analyze-company.dto.ts`
- `apps/api/src/companies/companies.service.ts`
- `apps/api/src/companies/companies.controller.ts`
- `apps/api/src/companies/companies.module.ts`
- `apps/api/test/companies.e2e-spec.ts`

**수정할 파일:**
- `apps/api/src/app.module.ts`

### Step 1: 실패 테스트 작성

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

**주의:** 이 테스트는 실제 OpenAI API를 호출한다. `.env`에 유효한 `OPENAI_API_KEY`가 있어야 통과한다. API 키가 없으면 `"status": "blocked"`로 처리한다.

### Step 2: 테스트 실행 (실패 확인)

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/companies.e2e-spec.ts --no-coverage 2>&1 | tail -5
```

Expected: `Cannot GET /companies` 또는 모듈 없음으로 실패.

### Step 3: Company DTOs 구현

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

### Step 4: CompaniesService 구현

`apps/api/src/companies/companies.service.ts`:
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
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

### Step 5: CompaniesController 구현

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

### Step 6: CompaniesModule 구현

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

### Step 7: app.module.ts에 CompaniesModule 추가

`apps/api/src/app.module.ts`의 imports 배열에 추가:
```typescript
import { CompaniesModule } from './companies/companies.module';

// imports 배열에 추가:
CompaniesModule,
```

### Step 8: 테스트 실행 (통과 확인)

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/companies.e2e-spec.ts --no-coverage
```

Expected: `3 passed` (list, analyze, get).

**주의:** OPENAI_API_KEY가 유효하지 않으면 테스트가 실패한다. 이 경우 `"status": "blocked"`, `"blocked_reason": "유효한 OPENAI_API_KEY 필요"` 후 즉시 중단.

### Step 9: 커밋

```bash
git add apps/api/src/companies apps/api/src/app.module.ts apps/api/test/companies.e2e-spec.ts
git commit -m "feat(api): add Companies module with AI analysis and 24h caching"
```

## Acceptance Criteria

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/companies.e2e-spec.ts --no-coverage
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/phase1-e-company-analysis/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - OPENAI_API_KEY 없음 → `"status": "blocked"`, `"blocked_reason": "유효한 OPENAI_API_KEY가 .env에 필요"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- Raw SQL 사용 금지. DB 쿼리는 모두 Prisma를 통해서만 한다
- 다른 유저의 기업 정보를 조회할 수 없도록 ForbiddenException 처리를 반드시 포함하라
- 24시간 캐시 로직을 반드시 구현하라. 동일 기업 재분석 요청 시 24시간 내라면 기존 데이터를 반환해야 한다
