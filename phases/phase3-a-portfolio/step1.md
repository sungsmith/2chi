# Step 1: ai-prompts

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/apps/api/src/ai/prompts/career-description.prompt.ts` — AI 프롬프트 패턴 참고
- `/apps/api/src/ai/ai.service.ts` — AiService 메서드 시그니처 참고
- `/apps/api/src/ai/ai.module.ts` — 모듈 구조 참고
- `/packages/shared/src/types/portfolio.ts` — Step 0에서 생성한 타입

이전 step 완료 summary: PortfolioDto, PortfolioSectionDto 타입 및 Zod 스키마 packages/shared에 추가

## 작업

포트폴리오 섹션 초안 생성을 위한 AI 프롬프트 파일과 AiService 메서드를 추가한다.

### 생성할 파일

**`apps/api/src/ai/prompts/portfolio.prompt.ts`**

```typescript
export function buildPortfolioSectionDraftPrompt(
  sectionType: string,
  sectionTitle: string,
  experiences: Array<{ title: string; situation: string; task: string; action: string; result: string }>,
  targetField?: string,
): string {
  return `당신은 취업 포트폴리오 작성 전문가입니다.

아래 경험 데이터를 바탕으로 포트폴리오 "${sectionTitle}" 섹션 내용을 작성하세요.

섹션 유형: ${sectionType}
${targetField ? `목표 직무: ${targetField}` : ''}

경험 데이터:
${experiences.map((e, i) => `
[경험 ${i + 1}] ${e.title}
- 상황: ${e.situation}
- 과제: ${e.task}
- 행동: ${e.action}
- 결과: ${e.result}
`).join('\n')}

작성 규칙:
- 300~500자 내외로 작성
- 구체적 수치와 성과를 포함할 것
- 포트폴리오 독자(채용 담당자)를 염두에 둔 전문적 문체
- 마크다운 형식 사용 가능 (굵게, 목록 등)
- 한국어로 작성`;
}
```

### 수정할 파일

**`apps/api/src/ai/ai.service.ts`**

기존 메서드를 수정하지 말고, 아래 메서드를 추가한다:

```typescript
async *streamPortfolioSectionDraft(
  sectionType: string,
  sectionTitle: string,
  experiences: Array<{ title: string; situation: string; task: string; action: string; result: string }>,
  targetField?: string,
): AsyncGenerator<string> {
  const prompt = buildPortfolioSectionDraftPrompt(sectionType, sectionTitle, experiences, targetField);
  yield* this.streamChatCompletion(prompt, 'gpt-4o');
}
```

파일 상단에 import 추가: `import { buildPortfolioSectionDraftPrompt } from './prompts/portfolio.prompt';`

## Acceptance Criteria

```bash
cd apps/api && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - `apps/api/src/ai/prompts/portfolio.prompt.ts`가 생성되었는가?
   - `AiService`에 `streamPortfolioSectionDraft` 메서드가 추가되었는가?
   - 기존 AiService 메서드가 변경되지 않았는가?
3. 성공 시 `phases/phase3-a-portfolio/index.json`의 step 1을 업데이트한다:
   - `"status": "completed"`, `"summary": "portfolio.prompt.ts 생성, AiService에 streamPortfolioSectionDraft 메서드 추가"`

## 금지사항

- `ai.service.ts`의 기존 메서드(streamChatCompletion 등)를 수정하지 마라. 이유: 다른 모듈이 의존하고 있다.
- GPT-4o-mini를 사용하지 마라. 이유: 포트폴리오 초안은 고품질 작업이므로 GPT-4o를 사용해야 한다.
