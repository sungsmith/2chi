# Step 1: ai-prompts-company-matching

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/ai/ai.service.ts`
- `apps/api/src/ai/ai.module.ts`
- `apps/api/src/ai/prompts/star.prompt.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

기업 분석과 역량 매칭도 계산을 위한 AI 프롬프트를 추가하고, AiService에 해당 메서드들을 구현한다.

**CRITICAL:** 기업 분석(analyzeCompany)과 역량 매칭도(calculateMatchingScore) 모두 GPT-4o-mini를 사용한다 (반복 작업).

**생성할 파일:**
- `apps/api/src/ai/prompts/company.prompt.ts`
- `apps/api/src/ai/prompts/matching.prompt.ts`

**수정할 파일:**
- `apps/api/src/ai/ai.service.ts`

### Step 1: 기업 분석 프롬프트

`apps/api/src/ai/prompts/company.prompt.ts`:
```typescript
export function buildCompanyAnalysisPrompt(
  companyName: string,
  jobTitle?: string,
  additionalContext?: string,
): string {
  return `당신은 취업 정보 분석가입니다. 아래 기업과 직무에 대해 분석하세요.

기업명: ${companyName}
${jobTitle ? `지원 직무: ${jobTitle}` : ''}
${additionalContext ? `추가 정보:\n${additionalContext}` : ''}

다음 JSON 형식으로 반환하세요:
{
  "summary": "기업 한 줄 요약 (사업 모델, 규모, 특징)",
  "products": ["주요 제품/서비스1", "주요 제품/서비스2"],
  "recentNews": ["최근 이슈/동향1", "최근 이슈/동향2"],
  "keyCompetencies": ["필요 역량1", "필요 역량2", "필요 역량3", "필요 역량4", "필요 역량5"],
  "culture": "기업 문화 한 줄 설명 (없으면 null)"
}

주의사항:
- 한국어로 작성
- keyCompetencies는 이 기업·직무에서 실제로 중요시하는 역량을 5~8개
- 확실하지 않은 정보는 포함하지 말 것
- 학습 데이터 기준으로 알고 있는 정보만 사용`;
}
```

### Step 2: 역량 매칭도 프롬프트

`apps/api/src/ai/prompts/matching.prompt.ts`:
```typescript
interface ExperienceSummary {
  title: string;
  action?: string | null;
  result?: string | null;
  tags: string[];
}

export function buildMatchingPrompt(
  requiredCompetencies: string[],
  experiences: ExperienceSummary[],
): string {
  const expText = experiences
    .map(
      (e, i) =>
        `[이력 ${i + 1}] ${e.title}
행동: ${e.action || '미입력'}
결과: ${e.result || '미입력'}
태그: ${e.tags.join(', ') || '없음'}`,
    )
    .join('\n\n');

  return `당신은 취업 역량 매칭 전문가입니다. 지원자의 이력이 직무 필수역량과 얼마나 일치하는지 평가하세요.

필수 역량:
${requiredCompetencies.join(', ')}

지원자 이력:
${expText || '(이력 없음)'}

다음 JSON 형식으로 반환하세요:
{
  "score": 0~100 사이의 정수,
  "matchedKeywords": ["매칭된 역량1", "매칭된 역량2"],
  "missingKeywords": ["부족한 역량1", "부족한 역량2"],
  "summary": "매칭도 평가 한 줄 요약"
}

평가 기준:
- score: 필수역량 중 이력에서 증명된 역량의 비율 (0~100)
- matchedKeywords: 이력에서 확인 가능한 역량
- missingKeywords: 이력에 없거나 약한 역량
- summary: "~역량이 강점이나 ~역량 보강 필요" 형태로 한 문장`;
}
```

### Step 3: AiService에 기업 분석 + 매칭도 메서드 추가

`apps/api/src/ai/ai.service.ts`에 다음 import 추가:
```typescript
import { buildCompanyAnalysisPrompt } from './prompts/company.prompt';
import { buildMatchingPrompt } from './prompts/matching.prompt';
```

클래스 내부에 메서드 추가:
```typescript
async analyzeCompany(
  companyName: string,
  jobTitle?: string,
  additionalContext?: string,
): Promise<{
  summary: string;
  products: string[];
  recentNews: string[];
  keyCompetencies: string[];
  culture: string | null;
}> {
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: buildCompanyAnalysisPrompt(companyName, jobTitle, additionalContext) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });
  const content = response.choices[0].message.content;
  if (!content) throw new Error('AI 응답이 없습니다.');
  return JSON.parse(content);
}

async calculateMatchingScore(
  requiredCompetencies: string[],
  experiences: Array<{
    title: string;
    action?: string | null;
    result?: string | null;
    tags: string[];
  }>,
): Promise<{ score: number; matchedKeywords: string[]; missingKeywords: string[]; summary: string }> {
  if (!requiredCompetencies.length) {
    return { score: 0, matchedKeywords: [], missingKeywords: [], summary: '역량 정보가 없습니다.' };
  }
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: buildMatchingPrompt(requiredCompetencies, experiences) }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });
  const content = response.choices[0].message.content;
  if (!content) throw new Error('AI 응답이 없습니다.');
  return JSON.parse(content);
}
```

### Step 4: 커밋

```bash
git add apps/api/src/ai/prompts/company.prompt.ts apps/api/src/ai/prompts/matching.prompt.ts apps/api/src/ai/ai.service.ts
git commit -m "feat(api): add company analysis and matching score AI prompts"
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
3. 결과에 따라 `phases/phase1-e-company-analysis/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- 기업 분석(analyzeCompany)에 GPT-4o를 사용하지 마라. 반복 작업이므로 반드시 GPT-4o-mini를 사용한다
- 역량 매칭도(calculateMatchingScore)에 GPT-4o를 사용하지 마라. 반드시 GPT-4o-mini를 사용한다
