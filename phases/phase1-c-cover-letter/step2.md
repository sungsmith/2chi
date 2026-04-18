# Step 2: job-postings-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/ai/ai.service.ts`
- `apps/api/src/ai/ai.module.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`
- `apps/api/src/prisma/prisma.service.ts`
- `packages/shared/src/types/cover-letter.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

JobPostings API를 구현한다. 채용공고 텍스트를 붙여넣으면 AI가 파싱하여 구조화된 데이터로 저장한다.

**생성할 파일:**
- `apps/api/src/job-postings/dto/parse-job-posting.dto.ts`
- `apps/api/src/job-postings/job-postings.service.ts`
- `apps/api/src/job-postings/job-postings.controller.ts`
- `apps/api/src/job-postings/job-postings.module.ts`

**수정할 파일:**
- `apps/api/src/app.module.ts`

### Step 1: ParseJobPostingDto 구현

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

### Step 2: JobPostingsService 구현

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

### Step 3: JobPostingsController 구현

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

### Step 4: JobPostingsModule 구현

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

### Step 5: app.module.ts에 JobPostingsModule 추가

`apps/api/src/app.module.ts`의 imports 배열에 추가:
```typescript
import { JobPostingsModule } from './job-postings/job-postings.module';

// imports 배열에 추가:
JobPostingsModule,
```

### Step 6: 커밋

```bash
git add apps/api/src/job-postings apps/api/src/app.module.ts
git commit -m "feat(api): add JobPostings module with AI parsing"
```

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
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
- 다른 유저의 공고를 조회·삭제할 수 없도록 ForbiddenException 처리를 반드시 포함하라
