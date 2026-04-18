# Step 1: ai-module

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/app.module.ts`
- `apps/api/src/prisma/prisma.service.ts`
- `.env.example`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

OpenAI SDK를 사용하는 AI 모듈을 구현한다. 자유 서술을 STAR 구조로 변환하는 기능을 포함한다.

**CRITICAL:** GPT-4o는 고품질 작업에만 사용한다. STAR 변환은 반복 작업이므로 GPT-4o-mini를 사용한다.

**생성할 파일:**
- `apps/api/src/ai/ai.module.ts`
- `apps/api/src/ai/ai.service.ts`
- `apps/api/src/ai/prompts/star.prompt.ts`

### Step 1: STAR 변환 프롬프트 작성

`apps/api/src/ai/prompts/star.prompt.ts`:
```typescript
export function buildStarPrompt(freeText: string, title: string): string {
  return `당신은 취업 컨설턴트입니다. 아래 자유 서술 이력을 STAR 구조로 변환해주세요.

이력 제목: ${title}
자유 서술:
${freeText}

STAR 구조로 변환하여 JSON으로 반환하세요:
{
  "situation": "상황 설명 (Situation) - 2~3문장",
  "task": "맡은 역할과 과제 (Task) - 2~3문장",
  "action": "구체적 행동 (Action) - 3~5문장, 본인이 한 일 중심",
  "result": "결과 (Result) - 2~3문장",
  "resultMetric": "수치 결과 (있으면, 없으면 null) - 예: 전환율 23% 향상"
}

주의사항:
- 한국어로 작성
- 원문에 없는 내용을 지어내지 마세요
- 각 항목은 1인칭(저는/제가)으로 작성
- resultMetric은 원문에 수치가 있을 때만 작성, 없으면 null`;
}
```

### Step 2: AiService 구현

`apps/api/src/ai/ai.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { buildStarPrompt } from './prompts/star.prompt';

@Injectable()
export class AiService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async convertToStar(
    freeText: string,
    title: string,
  ): Promise<{
    situation: string;
    task: string;
    action: string;
    result: string;
    resultMetric: string | null;
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: buildStarPrompt(freeText, title) }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('AI 응답이 없습니다.');

    return JSON.parse(content);
  }
}
```

`apps/api/src/ai/ai.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AiService } from './ai.service';

@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
```

### Step 3: 커밋

```bash
git add apps/api/src/ai
git commit -m "feat(api): add AI module with STAR conversion prompt"
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
3. 결과에 따라 `phases/phase1-b-experience/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- STAR 변환에 GPT-4o를 사용하지 마라. 반복 작업이므로 반드시 GPT-4o-mini를 사용한다
- OPENAI_API_KEY를 하드코딩하지 마라. 반드시 ConfigService를 통해 환경 변수에서 읽어라
