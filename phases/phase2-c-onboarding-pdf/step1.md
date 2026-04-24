# Step 1: ai-prompts-resume-parse

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md` — AI 모델 라우팅, PDF 파싱 섹션
- `apps/api/src/ai/ai.service.ts` — 기존 메서드 시그니처
- `apps/api/src/ai/prompts/` — 기존 프롬프트 파일들
- `packages/shared/src/types/onboarding.ts` — step 0에서 생성한 타입
- `packages/shared/src/types/experience.ts` — ExperienceType

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

이력서 텍스트를 STAR 구조의 경험 목록으로 변환하는 AI 프롬프트와 메서드를 추가한다.

### 생성할 파일

#### `apps/api/src/ai/prompts/resume-parse.prompt.ts`

```typescript
export function buildResumeParsePrompt(resumeText: string): string
```

**프롬프트 요구사항:**
- 이력서 텍스트에서 각 경험 항목을 추출
- 각 항목을 STAR 구조(Situation, Task, Action, Result)로 변환
- type 자동 분류: 직장 경험 → WORK, 프로젝트 → PROJECT, 대외활동 → ACTIVITY, 학력 → EDUCATION
- 날짜 파싱: 'YYYY-MM' 형식으로 통일
- 태그 자동 추천: 경험에서 추출한 기술 스택/역량 키워드
- 출력: JSON 배열 (`ParsedExperience[]`)
- 신뢰도(confidence) 0-100도 함께 반환

### 수정할 파일

#### `apps/api/src/ai/ai.service.ts`

아래 메서드를 추가한다:

```typescript
// 이력서 텍스트 → 경험 목록 구조화
// GPT-4o-mini 사용 (반복 파싱 작업)
async parseResumeToExperiences(resumeText: string): Promise<{
  experiences: ParsedExperience[];
  confidence: number;
}>
```

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
cd apps/api && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `parseResumeToExperiences`가 GPT-4o-mini를 사용하는가?
   - 프롬프트가 JSON 출력을 명시하는가?
3. 결과에 따라 `phases/phase2-c-onboarding-pdf/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "resume-parse.prompt.ts 생성, AiService에 parseResumeToExperiences() 추가"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- 이력서 파싱에 GPT-4o를 사용하지 마라. 이유: 파싱은 반복 구조화 작업이므로 GPT-4o-mini로 충분하다. `docs/ARCHITECTURE.md` AI 모델 라우팅 표 참고.
- 기존 `AiService` 메서드를 수정하지 마라.
