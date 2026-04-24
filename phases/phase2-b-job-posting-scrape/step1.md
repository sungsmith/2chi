# Step 1: ai-prompts-scrape

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md` — AI 모델 라우팅 섹션
- `apps/api/src/ai/ai.service.ts` — 기존 메서드 시그니처
- `apps/api/src/ai/prompts/` — 기존 프롬프트 파일들
- `packages/shared/src/types/cover-letter.ts` — JobPostingDto, CompetencyGapDto

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

채용공고 URL HTML 파싱과 역량 갭 분석을 위한 AI 프롬프트와 메서드를 추가한다.

### 패키지 설치

```bash
cd apps/api && pnpm add cheerio
cd apps/api && pnpm add -D @types/cheerio
```

### 생성할 파일

#### `apps/api/src/ai/prompts/scrape.prompt.ts`

```typescript
// HTML 전처리 후 채용공고 구조화 파싱 프롬프트
// 기존 buildJobPostingParsePrompt()와 동일한 JSON 출력 스키마 사용
// (title, company, requiredCompetencies[], preferredCompetencies[], deadline?)
export function buildScrapeParsePrompt(text: string): string

// 역량 갭 분석 프롬프트
// myExperiences의 tags와 requiredCompetencies를 비교하여 matched/missing 분류
export function buildCompetencyGapPrompt(
  requiredCompetencies: string[],
  preferredCompetencies: string[],
  myExperiences: Array<{ title: string; tags: string[]; situation?: string; action?: string }>,
): string
```

### 수정할 파일

#### `apps/api/src/ai/ai.service.ts`

아래 메서드 2개를 추가한다:

```typescript
// HTML 텍스트 → 채용공고 구조화
// GPT-4o-mini 사용 (반복 파싱 작업)
async parseJobPostingFromHtml(htmlText: string): Promise<{
  title: string;
  company: string;
  requiredCompetencies: string[];
  preferredCompetencies: string[];
  deadline?: string;
  rawText: string;
}>

// 역량 갭 분석
// GPT-4o-mini 사용
async analyzeCompetencyGap(
  requiredCompetencies: string[],
  preferredCompetencies: string[],
  myExperiences: Array<{ title: string; tags: string[]; situation?: string; action?: string }>,
): Promise<CompetencyGapDto>
```

**HTML 전처리 유틸리티 (ai.service.ts 내부 또는 별도 함수):**

```typescript
// cheerio를 사용하여 HTML에서 불필요한 태그 제거 후 텍스트 추출
// 제거 대상: <script>, <style>, <nav>, <header>, <footer>, <aside>
// 최대 8000자로 절단 (GPT 토큰 한도 방어)
private extractTextFromHtml(html: string): string
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
   - `parseJobPostingFromHtml`이 GPT-4o-mini를 사용하는가?
   - `analyzeCompetencyGap`이 GPT-4o-mini를 사용하는가?
   - HTML 전처리 시 8000자 절단이 적용되는가?
3. 결과에 따라 `phases/phase2-b-job-posting-scrape/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "scrape.prompt.ts 생성, AiService에 parseJobPostingFromHtml, analyzeCompetencyGap 추가"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- URL 스크랩 파싱에 GPT-4o를 사용하지 마라. 이유: 파싱은 반복 작업이며 GPT-4o-mini로 충분하다. 비용이 ~90% 절감된다.
- HTML 전체를 GPT에 그대로 전달하지 마라. 이유: 일반적인 채용공고 페이지의 HTML은 50,000자를 넘어 토큰 한도를 초과하고 비용이 폭발한다.
- 기존 `calculateMatchingScore()` 메서드를 수정하지 마라. 이유: cover-letter 매칭도 계산이 이 메서드에 의존한다. 새 `analyzeCompetencyGap()` 메서드를 별도로 추가하라.
