# Step 2: interview-prep-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/apps/api/src/career-descriptions/career-descriptions.controller.ts` — 컨트롤러 패턴
- `/apps/api/src/career-descriptions/career-descriptions.service.ts` — 서비스 패턴
- `/apps/api/src/companies/companies.processor.ts` — Bull Queue 프로세서 패턴 (비동기 AI 처리)
- `/apps/api/src/companies/companies.module.ts` — BullModule 등록 패턴
- `/apps/api/src/ai/ai.service.ts` — Step 1에서 추가한 메서드 확인
- `/packages/shared/src/types/interview-prep.ts` — Step 0에서 생성한 타입
- `/packages/shared/src/schemas/interview-prep.schema.ts` — Step 0에서 생성한 스키마
- `/apps/api/prisma/schema.prisma` — InterviewPrep, InterviewAnswer 모델

이전 steps 완료 summary:
- Step 0: InterviewPrepDto, InterviewAnswerDto 타입 및 Zod 스키마 packages/shared에 추가
- Step 1: interview-prep.prompt.ts 생성, AiService에 generateInterviewQuestions(4o-mini), generateInterviewFeedback(4o) 추가

## 작업

면접준비 NestJS 모듈을 생성한다. 질문 생성과 AI 피드백은 Bull Queue를 통해 비동기 처리한다.

### 생성할 파일

**`apps/api/src/interview-preps/dto/create-interview-prep.dto.ts`**
**`apps/api/src/interview-preps/dto/generate-questions.dto.ts`**
**`apps/api/src/interview-preps/dto/save-answer.dto.ts`**

class-validator 기반 DTO. `packages/shared` 스키마와 동일한 제약 조건 적용.

**`apps/api/src/interview-preps/interview-preps.service.ts`**

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class InterviewPrepsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    @InjectQueue('interview-prep') private readonly queue: Queue,
  ) {}

  async findAll(userId: string): Promise<InterviewPrepDto[]>
  async findOne(id: string, userId: string): Promise<InterviewPrepDto>  // answers 포함
  async create(userId: string, dto: CreateInterviewPrepDto): Promise<InterviewPrepDto>
  async remove(id: string, userId: string): Promise<void>

  // 질문 생성 — Bull Queue 비동기
  async generateQuestions(id: string, userId: string, dto: GenerateQuestionsDto): Promise<{ jobId: string }>

  // 답변 저장
  async saveAnswer(id: string, answerId: string, userId: string, dto: SaveAnswerDto): Promise<InterviewAnswerDto>

  // AI 피드백 — Bull Queue 비동기
  async requestFeedback(id: string, answerId: string, userId: string): Promise<{ jobId: string }>
}
```

`generateQuestions`는 `this.queue.add('generate-questions', { interviewPrepId: id, userId, dto })` 형태로 큐에 추가 후 `{ jobId: job.id.toString() }` 반환.
`requestFeedback`는 `this.queue.add('generate-feedback', { interviewPrepId: id, answerId, userId })` 형태로 큐에 추가 후 `{ jobId: job.id.toString() }` 반환.

핵심 규칙:
- 모든 메서드에서 userId 검증 필수 (NotFoundException → ForbiddenException 순서로 검증)
- AI 작업은 반드시 Bull Queue를 통해야 한다

**`apps/api/src/interview-preps/interview-preps.processor.ts`**

```typescript
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('interview-prep')
export class InterviewPrepsProcessor {
  @Process('generate-questions')
  async handleGenerateQuestions(job: Job): Promise<void> {
    // 1. job.data에서 interviewPrepId, userId, dto 추출
    // 2. DB에서 InterviewPrep과 관련 JobPosting 조회
    // 3. AiService.generateInterviewQuestions 호출
    // 4. 생성된 질문을 InterviewAnswer 레코드로 DB에 저장
  }

  @Process('generate-feedback')
  async handleGenerateFeedback(job: Job): Promise<void> {
    // 1. job.data에서 interviewPrepId, answerId, userId 추출
    // 2. DB에서 InterviewAnswer 조회
    // 3. AiService.generateInterviewFeedback 호출
    // 4. aiFeedback, score를 DB에 업데이트
  }
}
```

**`apps/api/src/interview-preps/interview-preps.controller.ts`**

```typescript
@Controller('interview-preps')
@UseGuards(JwtAuthGuard)
export class InterviewPrepsController {
  @Get()              // 목록 조회
  @Get(':id')         // 단건 조회 (answers 포함)
  @Post()             // 생성
  @Delete(':id')      // 삭제

  @Post(':id/generate-questions')         // 질문 생성 요청 → { jobId }
  @Patch(':id/answers/:answerId')         // 답변 저장
  @Post(':id/answers/:answerId/feedback') // AI 피드백 요청 → { jobId }
}
```

**`apps/api/src/interview-preps/interview-preps.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    BullModule.registerQueue({ name: 'interview-prep' }),
  ],
  controllers: [InterviewPrepsController],
  providers: [InterviewPrepsService, InterviewPrepsProcessor],
})
export class InterviewPrepsModule {}
```

### 수정할 파일

**`apps/api/src/app.module.ts`** — `InterviewPrepsModule` import 추가

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
cd apps/api && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - 질문 생성과 AI 피드백이 Bull Queue를 통하는가?
   - userId 검증이 모든 메서드에 있는가?
   - `app.module.ts`에 `InterviewPrepsModule`이 추가되었는가?
3. 성공 시 `phases/phase3-b-interview-prep/index.json`의 step 2를 업데이트한다:
   - `"status": "completed"`, `"summary": "interview-preps NestJS 모듈 생성 — Bull Queue 비동기 질문생성/피드백, CRUD, 답변 저장 포함"`

## 금지사항

- 질문 생성과 AI 피드백을 요청 스레드에서 직접 실행하지 마라. 이유: AI 작업은 반드시 Bull Queue를 통해 비동기 처리해야 한다 (CLAUDE.md CRITICAL 규칙).
- Raw SQL을 사용하지 마라. 이유: 모든 DB 쿼리는 Prisma를 통해야 한다.
