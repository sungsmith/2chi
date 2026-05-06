# Step 3: interview-prep-hooks

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/apps/web/hooks/use-career-descriptions.ts` — TanStack Query 훅 패턴
- `/packages/shared/src/types/interview-prep.ts` — Step 0에서 생성한 타입
- `/packages/shared/src/schemas/interview-prep.schema.ts` — Step 0에서 생성한 스키마

이전 steps 완료 summary:
- Step 0: InterviewPrepDto, InterviewAnswerDto 타입 및 Zod 스키마 packages/shared에 추가
- Step 1: interview-prep.prompt.ts 생성, AiService에 generateInterviewQuestions(4o-mini), generateInterviewFeedback(4o) 추가
- Step 2: interview-preps NestJS 모듈 생성 — Bull Queue 비동기 질문생성/피드백, CRUD, 답변 저장 포함

## 작업

면접준비 TanStack Query 훅을 생성한다.

### 생성할 파일

**`apps/web/hooks/use-interview-preps.ts`**

기존 use-career-descriptions.ts 패턴을 따른다:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  InterviewPrepDto,
  InterviewAnswerDto,
  CreateInterviewPrepInput,
  GenerateQuestionsInput,
  SaveAnswerInput,
} from '@2chi/shared';

const INTERVIEW_PREP_KEY = ['interview-preps'] as const;

export function useInterviewPreps(): UseQueryResult<InterviewPrepDto[]>
export function useInterviewPrep(id: string): UseQueryResult<InterviewPrepDto>
export function useCreateInterviewPrep(): UseMutationResult<InterviewPrepDto, Error, CreateInterviewPrepInput>
export function useDeleteInterviewPrep(): UseMutationResult<void, Error, string>

// 질문 생성 요청 (비동기 — jobId 반환, 완료 시 refetch 필요)
export function useGenerateQuestions(id: string): UseMutationResult<{ jobId: string }, Error, GenerateQuestionsInput>

// 답변 저장
export function useSaveAnswer(id: string): UseMutationResult<InterviewAnswerDto, Error, { answerId: string } & SaveAnswerInput>

// AI 피드백 요청 (비동기 — jobId 반환, 완료 시 refetch 필요)
export function useRequestFeedback(id: string): UseMutationResult<{ jobId: string }, Error, string>
```

`useGenerateQuestions`와 `useRequestFeedback`은 Bull Queue 비동기이므로 jobId만 반환한다.
이 두 훅의 `onSuccess`에서 `queryClient.invalidateQueries({ queryKey: [...INTERVIEW_PREP_KEY, id] })`를 호출하여 완료 후 데이터를 갱신한다.

## Acceptance Criteria

```bash
cd apps/web && pnpm build
# 타입 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - 모든 mutation 성공 시 관련 query가 invalidate되는가?
   - `useGenerateQuestions`와 `useRequestFeedback`이 `{ jobId: string }`을 반환하는가?
3. 성공 시 `phases/phase3-b-interview-prep/index.json`의 step 3을 업데이트한다:
   - `"status": "completed"`, `"summary": "use-interview-preps.ts 생성 — CRUD, 질문생성, 답변저장, 피드백 요청 훅 포함"`

## 금지사항

- TanStack Query로 Bull Queue 작업 상태를 폴링하지 마라. 이유: 과도한 API 요청이 발생한다. UI에서 "처리 중..." 메시지를 표시하고, 사용자가 수동으로 새로고침하거나 일정 시간 후 refetch하는 방식으로 구현한다.
