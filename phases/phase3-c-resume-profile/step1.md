# Step 1: resume-profile-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/apps/api/src/career-descriptions/career-descriptions.controller.ts` — 컨트롤러 패턴
- `/apps/api/src/career-descriptions/career-descriptions.service.ts` — 서비스 패턴
- `/apps/api/src/experiences/experiences.service.ts` — Experience 조회 패턴
- `/apps/api/src/experiences/experiences.module.ts` — ExperiencesModule exports 확인
- `/packages/shared/src/types/resume-profile.ts` — Step 0에서 생성한 타입
- `/packages/shared/src/schemas/resume-profile.schema.ts` — Step 0에서 생성한 스키마
- `/apps/api/prisma/schema.prisma` — ResumeProfile 모델

이전 step 완료 summary: ResumeProfileDto 타입 및 Zod 스키마 packages/shared에 추가

## 작업

이력 프로필 NestJS 모듈을 생성한다. AI 없이 순수 CRUD만 구현한다.

### 생성할 파일

**`apps/api/src/resume-profiles/dto/create-resume-profile.dto.ts`**
**`apps/api/src/resume-profiles/dto/update-resume-profile.dto.ts`**

class-validator 기반 DTO. `packages/shared` 스키마와 동일한 제약 조건 적용.

**`apps/api/src/resume-profiles/resume-profiles.service.ts`**

```typescript
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResumeProfileDto } from '@2chi/shared';
import { CreateResumeProfileDto } from './dto/create-resume-profile.dto';
import { UpdateResumeProfileDto } from './dto/update-resume-profile.dto';

@Injectable()
export class ResumeProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<ResumeProfileDto[]>
    // experiences 없이 목록만 반환 (selectedExperienceIds 포함)

  async findOne(id: string, userId: string): Promise<ResumeProfileDto>
    // selectedExperienceIds에 해당하는 Experience들을 DB에서 조회하여 experiences 필드에 포함

  async create(userId: string, dto: CreateResumeProfileDto): Promise<ResumeProfileDto>

  async update(id: string, userId: string, dto: UpdateResumeProfileDto): Promise<ResumeProfileDto>

  async remove(id: string, userId: string): Promise<void>
}
```

핵심 규칙:
- 모든 메서드에서 userId 검증 필수
- `findOne`은 `selectedExperienceIds`에 해당하는 Experience 상세를 experiences 필드로 반환
- `create`/`update` 시 존재하지 않는 experienceId가 포함되면 `BadRequestException` throw

**`apps/api/src/resume-profiles/resume-profiles.controller.ts`**

```typescript
@Controller('resume-profiles')
@UseGuards(JwtAuthGuard)
export class ResumeProfilesController {
  @Get()         // 목록 (experiences 미포함)
  @Get(':id')    // 단건 (experiences 포함)
  @Post()        // 생성
  @Patch(':id')  // 수정
  @Delete(':id') // 삭제
}
```

모든 응답은 `{ success: true, data: T }` 형식.

**`apps/api/src/resume-profiles/resume-profiles.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResumeProfilesController],
  providers: [ResumeProfilesService],
})
export class ResumeProfilesModule {}
```

### 수정할 파일

**`apps/api/src/app.module.ts`** — `ResumeProfilesModule` import 추가

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
cd apps/api && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - userId 검증이 모든 메서드에 있는가?
   - 존재하지 않는 experienceId에 BadRequestException이 throw되는가?
   - `app.module.ts`에 `ResumeProfilesModule`이 추가되었는가?
3. 성공 시 `phases/phase3-c-resume-profile/index.json`의 step 1을 업데이트한다:
   - `"status": "completed"`, `"summary": "resume-profiles NestJS 모듈 생성 — CRUD, experiences populate 포함"`

## 금지사항

- AI 기능을 추가하지 마라. 이유: 이력 프로필은 순수 CRUD 기능이다. YAGNI.
- 존재하지 않는 experienceId 검증을 건너뛰지 마라. 이유: 데이터 무결성 보장 필수.
- Raw SQL을 사용하지 마라. 이유: 모든 DB 쿼리는 Prisma를 통해야 한다.
