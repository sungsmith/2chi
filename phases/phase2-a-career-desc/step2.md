# Step 2: ai-prompts-career-desc

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md` — AI 모델 라우팅 섹션
- `apps/api/src/ai/ai.service.ts` — 기존 메서드 시그니처와 패턴
- `apps/api/src/ai/prompts/` — 기존 프롬프트 파일들 패턴 참고
- `packages/shared/src/types/career-description.ts` — step 0에서 생성한 타입
- `apps/api/src/cover-letters/cover-letters.service.ts` — streamDraft() 패턴 참고

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

경력기술서 섹션 AI 초안 생성을 위한 프롬프트 빌더와 AiService 메서드를 추가한다.

### 생성할 파일

#### `apps/api/src/ai/prompts/career-description.prompt.ts`

아래 함수를 구현한다:

```typescript
interface StarExperience {
  title: string;
  type: string;
  companyName?: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  resultMetric?: string;
  tags?: string[];
}

export function buildCareerDescSectionDraftPrompt(
  sectionType: string,  // 'INTRO' | 'EXPERIENCE' | 'SKILL' | 'ACHIEVEMENT' | 'CUSTOM'
  experiences: StarExperience[],
  targetJobType?: string,
): string
```

**프롬프트 요구사항:**
- 한국어로 작성 지시
- 섹션 타입별 목적 안내 (INTRO: 자기소개, EXPERIENCE: 경력 기술, SKILL: 기술/역량, ACHIEVEMENT: 성과, CUSTOM: 자유 형식)
- STAR 구조의 경험을 자연스러운 경력기술서 문체로 변환
- 글자 수 안내 (섹션당 300~500자 권장)
- targetJobType이 있으면 해당 직무에 맞는 키워드 포함 지시

### 수정할 파일

#### `apps/api/src/ai/ai.service.ts`

아래 메서드를 추가한다:

```typescript
// SSE 스트리밍 — GPT-4o 사용 (경력기술서는 고품질 산출물)
async *streamCareerDescSectionDraft(
  sectionType: string,
  experiences: StarExperience[],
  targetJobType?: string,
): AsyncGenerator<string>
```

구현 참고: 기존 `streamChatCompletion()` 메서드를 활용하여 구현한다.

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
# lint 에러 없음
cd apps/api && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `streamCareerDescSectionDraft`가 GPT-4o 모델을 사용하는가?
   - 프롬프트가 한국어 출력을 명시적으로 지시하는가?
   - `StarExperience` 인터페이스가 `experiences.ts`의 ExperienceDto와 호환되는가?
3. 결과에 따라 `phases/phase2-a-career-desc/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "career-description.prompt.ts 생성, AiService에 streamCareerDescSectionDraft() 추가"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- 경력기술서 초안 생성에 GPT-4o-mini를 사용하지 마라. 이유: 경력기술서는 사용자가 직접 제출하는 고품질 산출물이며, `docs/ARCHITECTURE.md`의 AI 모델 라우팅 표에서 GPT-4o로 명시되어 있다.
- 기존 `AiService` 메서드(analyzeCompany, streamChatCompletion 등)를 수정하지 마라. 이유: 다른 기능들이 이 메서드에 의존하고 있다.
