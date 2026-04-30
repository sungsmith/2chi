# Step 1: ai-prompts

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/apps/api/src/ai/prompts/cover-letter.prompt.ts` — 프롬프트 패턴 참고
- `/apps/api/src/ai/prompts/matching.prompt.ts` — JSON 출력 프롬프트 패턴 참고
- `/apps/api/src/ai/ai.service.ts` — 기존 메서드 확인
- `/packages/shared/src/types/interview-prep.ts` — Step 0에서 생성한 타입

이전 step 완료 summary: InterviewPrepDto, InterviewAnswerDto 타입 및 Zod 스키마 packages/shared에 추가

## 작업

면접 질문 생성과 답변 피드백을 위한 AI 프롬프트와 AiService 메서드를 추가한다.

### 생성할 파일

**`apps/api/src/ai/prompts/interview-prep.prompt.ts`**

두 함수를 구현한다:

```typescript
export function buildInterviewQuestionsPrompt(
  jobTitle: string,
  jobDescription: string,
  experienceSummaries: string[],
  count: number,
  questionTypes?: string[],
): string {
  // 직무 기반 예상 면접 질문 생성 프롬프트
  // 출력 형식: JSON 배열 [{ "question": "...", "questionType": "COMPETENCY|BEHAVIORAL|TECHNICAL|SITUATIONAL", "order": 0 }]
  // questionTypes가 주어지면 해당 유형에서만 질문 생성
}

export function buildInterviewFeedbackPrompt(
  question: string,
  questionType: string,
  answer: string,
): string {
  // 답변 평가 프롬프트
  // 출력 형식: JSON { "feedback": "구체적 개선 제안", "score": 0~100 }
  // score 기준: 구체성(30), 논리성(30), 직무 연관성(40)
}
```

### 수정할 파일

**`apps/api/src/ai/ai.service.ts`**

기존 메서드를 수정하지 말고 아래 메서드만 추가:

```typescript
async generateInterviewQuestions(
  jobTitle: string,
  jobDescription: string,
  experienceSummaries: string[],
  count: number,
  questionTypes?: string[],
): Promise<Array<{ question: string; questionType: string; order: number }>> {
  // buildInterviewQuestionsPrompt로 프롬프트 생성
  // GPT-4o-mini로 호출 (반복 작업)
  // JSON 파싱 후 반환
}

async generateInterviewFeedback(
  question: string,
  questionType: string,
  answer: string,
): Promise<{ feedback: string; score: number }> {
  // buildInterviewFeedbackPrompt로 프롬프트 생성
  // GPT-4o로 호출 (고품질 작업)
  // JSON 파싱 후 반환
}
```

두 메서드에 대한 import 추가:
`import { buildInterviewQuestionsPrompt, buildInterviewFeedbackPrompt } from './prompts/interview-prep.prompt';`

## Acceptance Criteria

```bash
cd apps/api && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - `apps/api/src/ai/prompts/interview-prep.prompt.ts`가 생성되었는가?
   - `AiService`에 두 메서드가 추가되었는가?
   - 기존 AiService 메서드가 변경되지 않았는가?
   - 질문 생성은 GPT-4o-mini, 피드백은 GPT-4o를 사용하는가?
3. 성공 시 `phases/phase3-b-interview-prep/index.json`의 step 1을 업데이트한다:
   - `"status": "completed"`, `"summary": "interview-prep.prompt.ts 생성, AiService에 generateInterviewQuestions(4o-mini), generateInterviewFeedback(4o) 추가"`

## 금지사항

- 기존 AiService 메서드(streamChatCompletion 등)를 수정하지 마라.
- 답변 피드백에 GPT-4o-mini를 사용하지 마라. 이유: 피드백은 고품질 작업이므로 GPT-4o 필수.
- 질문 생성에 GPT-4o를 사용하지 마라. 이유: 반복 작업이므로 GPT-4o-mini로 비용 최적화.
