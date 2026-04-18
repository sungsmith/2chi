# Step 1: ai-prompts-cover-letter

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/ai/ai.service.ts`
- `apps/api/src/ai/ai.module.ts`
- `apps/api/src/ai/prompts/star.prompt.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

채용공고 파싱, 자소서 초안 생성(SSE 스트리밍), 피드백 AI 프롬프트를 추가하고 AiService에 해당 메서드들을 구현한다.

**CRITICAL:** 자소서 초안 생성(streamCoverLetterDraft)은 GPT-4o를 사용한다 (고품질 작업). 공고 파싱(parseJobPosting)은 GPT-4o-mini를 사용한다 (반복 작업).

**생성할 파일:**
- `apps/api/src/ai/prompts/job-posting.prompt.ts`
- `apps/api/src/ai/prompts/cover-letter.prompt.ts`
- `apps/api/src/ai/prompts/feedback.prompt.ts`

**수정할 파일:**
- `apps/api/src/ai/ai.service.ts`

### Step 1: 공고 파싱 프롬프트

`apps/api/src/ai/prompts/job-posting.prompt.ts`:
```typescript
export function buildJobPostingParsePrompt(text: string): string {
  return `아래 채용공고 텍스트를 분석하여 구조화된 JSON으로 반환하세요.

채용공고 텍스트:
${text}

다음 JSON 형식으로 반환하세요:
{
  "title": "직무명",
  "department": "부서명 (없으면 null)",
  "companyName": "회사명 (없으면 null)",
  "deadline": "마감일 YYYY-MM-DD (없으면 null)",
  "requiredCompetencies": ["필수 역량1", "필수 역량2"],
  "preferredCompetencies": ["우대 역량1", "우대 역량2"],
  "requirements": "자격 요건 원문 (없으면 null)"
}

주의:
- 한국어로 작성
- 확실하지 않은 정보는 null 또는 빈 배열
- requiredCompetencies와 preferredCompetencies는 역량 키워드 중심으로 5개 이내`;
}
```

### Step 2: 자소서 초안 프롬프트

`apps/api/src/ai/prompts/cover-letter.prompt.ts`:
```typescript
interface StarExperience {
  title: string;
  situation?: string | null;
  task?: string | null;
  action?: string | null;
  result?: string | null;
  resultMetric?: string | null;
}

interface JobContext {
  title: string;
  requiredCompetencies: string[];
}

export function buildCoverLetterDraftPrompt(
  question: string,
  charLimit: number | null,
  experiences: StarExperience[],
  jobContext: JobContext | null,
): string {
  const experiencePart = experiences
    .map(
      (e, i) => `[이력 ${i + 1}] ${e.title}
상황: ${e.situation || '미입력'}
과제: ${e.task || '미입력'}
행동: ${e.action || '미입력'}
결과: ${e.result || '미입력'}${e.resultMetric ? `\n수치: ${e.resultMetric}` : ''}`,
    )
    .join('\n\n');

  const jobPart = jobContext
    ? `직무: ${jobContext.title}\n필수역량: ${jobContext.requiredCompetencies.join(', ')}`
    : '';

  const limitPart = charLimit ? `\n글자 수 제한: ${charLimit}자 이내로 작성하세요.` : '';

  return `당신은 취업 전문 작가입니다. 아래 정보를 바탕으로 자기소개서 항목의 초안을 작성하세요.

항목 질문:
${question}

지원 직무 정보:
${jobPart || '(직무 정보 없음)'}

보유 이력:
${experiencePart || '(이력 정보 없음)'}
${limitPart}

작성 기준:
- 1인칭(저는/제가)으로 작성
- STAR 구조의 구체적 경험을 근거로 활용
- 지원 직무의 필수역량과 연결
- 진부한 표현(열정적인, 성실한 등) 최소화
- 글자 제한이 있으면 그 안에서 핵심만 담기
- 자연스러운 한국어 문어체

지금 바로 본문만 작성하세요. 설명이나 제목 없이 자기소개서 본문만.`;
}
```

### Step 3: 피드백 프롬프트

`apps/api/src/ai/prompts/feedback.prompt.ts`:
```typescript
export function buildFeedbackPrompt(
  question: string,
  content: string,
  requiredKeywords: string[],
): string {
  return `당신은 자기소개서 전문 컨설턴트입니다. 아래 자기소개서 항목을 평가하세요.

항목 질문:
${question}

작성 내용:
${content}

필수 키워드 (직무 역량):
${requiredKeywords.length ? requiredKeywords.join(', ') : '(없음)'}

다음 JSON 형식으로 반환하세요:
{
  "score": 0~100 사이의 점수,
  "awkwardPhrases": ["어색한 표현1", "어색한 표현2"],
  "suggestions": ["개선 제안1", "개선 제안2", "개선 제안3"],
  "missingKeywords": ["빠진 키워드1", "빠진 키워드2"]
}

평가 기준:
- score: STAR 구조 완성도(40), 직무 연관성(30), 표현력(20), 글자 효율(10)
- awkwardPhrases: 5개 이하
- suggestions: 구체적이고 실행 가능한 제안, 3개
- missingKeywords: 필수 키워드 중 내용에 없는 것`;
}
```

### Step 4: AiService에 자소서 관련 메서드 추가

`apps/api/src/ai/ai.service.ts`에 다음 import와 메서드들을 추가:

기존 import 아래에 추가:
```typescript
import { buildJobPostingParsePrompt } from './prompts/job-posting.prompt';
import { buildCoverLetterDraftPrompt } from './prompts/cover-letter.prompt';
import { buildFeedbackPrompt } from './prompts/feedback.prompt';
```

클래스 내부에 메서드 추가:
```typescript
async parseJobPosting(text: string): Promise<{
  title: string;
  department: string | null;
  companyName: string | null;
  deadline: string | null;
  requiredCompetencies: string[];
  preferredCompetencies: string[];
  requirements: string | null;
}> {
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: buildJobPostingParsePrompt(text) }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });
  const content = response.choices[0].message.content;
  if (!content) throw new Error('AI 응답이 없습니다.');
  return JSON.parse(content);
}

async *streamCoverLetterDraft(
  question: string,
  charLimit: number | null,
  experiences: Array<{ title: string; situation?: string | null; task?: string | null; action?: string | null; result?: string | null; resultMetric?: string | null }>,
  jobContext: { title: string; requiredCompetencies: string[] } | null,
): AsyncGenerator<string> {
  const stream = await this.openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: buildCoverLetterDraftPrompt(question, charLimit, experiences, jobContext) }],
    stream: true,
    temperature: 0.7,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

async generateFeedback(
  question: string,
  content: string,
  requiredKeywords: string[],
): Promise<{ score: number; awkwardPhrases: string[]; suggestions: string[]; missingKeywords: string[] }> {
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: buildFeedbackPrompt(question, content, requiredKeywords) }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });
  const content_ = response.choices[0].message.content;
  if (!content_) throw new Error('AI 응답이 없습니다.');
  return JSON.parse(content_);
}
```

### Step 5: 커밋

```bash
git add apps/api/src/ai/prompts apps/api/src/ai/ai.service.ts
git commit -m "feat(api): add job posting parse, cover letter draft, and feedback AI prompts"
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
3. 결과에 따라 `phases/phase1-c-cover-letter/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- 자소서 초안 생성(streamCoverLetterDraft)에 GPT-4o-mini를 사용하지 마라. 고품질 작업이므로 반드시 GPT-4o를 사용한다
- 공고 파싱(parseJobPosting)에 GPT-4o를 사용하지 마라. 반복 작업이므로 반드시 GPT-4o-mini를 사용한다
- OPENAI_API_KEY를 하드코딩하지 마라. 반드시 ConfigService를 통해 환경 변수에서 읽어라
