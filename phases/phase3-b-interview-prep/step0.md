# Step 0: shared-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/packages/shared/src/types/cover-letter.ts` — 기존 타입 패턴 참고
- `/packages/shared/src/index.ts` — export 패턴 확인
- `/apps/api/prisma/schema.prisma` — InterviewPrep, InterviewAnswer 모델 확인

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`packages/shared/src/` 아래에 면접준비 타입과 Zod 스키마를 추가한다.

### 생성할 파일

**`packages/shared/src/types/interview-prep.ts`**

```typescript
export type InterviewQuestionType = 'COMPETENCY' | 'BEHAVIORAL' | 'TECHNICAL' | 'SITUATIONAL';

export interface InterviewAnswerDto {
  id: string;
  interviewPrepId: string;
  question: string;
  questionType: InterviewQuestionType;
  answer: string;
  aiFeedback: string | null;
  score: number | null;  // 0~100
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewPrepDto {
  id: string;
  userId: string;
  jobPostingId: string | null;
  title: string;
  answers: InterviewAnswerDto[];
  createdAt: string;
  updatedAt: string;
}
```

**`packages/shared/src/schemas/interview-prep.schema.ts`**

```typescript
import { z } from 'zod';

export const CreateInterviewPrepSchema = z.object({
  title: z.string().min(1).max(100),
  jobPostingId: z.string().optional(),
});

export const GenerateQuestionsSchema = z.object({
  count: z.number().int().min(3).max(20).default(10),
  questionTypes: z.array(z.enum(['COMPETENCY', 'BEHAVIORAL', 'TECHNICAL', 'SITUATIONAL'])).optional(),
});

export const SaveAnswerSchema = z.object({
  answer: z.string().min(1),
});

export type CreateInterviewPrepInput = z.infer<typeof CreateInterviewPrepSchema>;
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsSchema>;
export type SaveAnswerInput = z.infer<typeof SaveAnswerSchema>;
```

### 수정할 파일

**`packages/shared/src/index.ts`**

interview-prep 타입과 스키마를 export에 추가한다:

```typescript
export * from './types/interview-prep';
export * from './schemas/interview-prep.schema';
```

## Acceptance Criteria

```bash
cd packages/shared && pnpm build
# 타입 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - `packages/shared/src/types/interview-prep.ts`가 생성되었는가?
   - `packages/shared/src/schemas/interview-prep.schema.ts`가 생성되었는가?
   - `packages/shared/src/index.ts`에 export가 추가되었는가?
3. 성공 시 `phases/phase3-b-interview-prep/index.json`의 step 0을 업데이트한다:
   - `"status": "completed"`, `"summary": "InterviewPrepDto, InterviewAnswerDto 타입 및 Zod 스키마 packages/shared에 추가"`

## 금지사항

- prisma schema를 수정하지 마라. 이유: InterviewPrep, InterviewAnswer 모델이 이미 존재한다.
- 기존 타입 파일(cover-letter.ts 등)을 수정하지 마라. 이유: 기존 기능에 영향을 준다.
