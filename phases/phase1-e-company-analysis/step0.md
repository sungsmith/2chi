# Step 0: shared-company-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `packages/shared/src/index.ts`
- `packages/shared/src/types/api.ts`
- `packages/shared/src/types/experience.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

packages/shared에 Company, MatchingScore 관련 타입과 Zod 스키마를 추가한다.

**CRITICAL:** 이 타입들은 프론트와 백 양쪽에서 공유된다. 각 앱에서 독자적으로 재정의하지 마라.

**생성할 파일:**
- `packages/shared/src/types/company.ts`
- `packages/shared/src/schemas/company.schema.ts`

**수정할 파일:**
- `packages/shared/src/index.ts`

### Step 1: company 타입 작성

`packages/shared/src/types/company.ts`:
```typescript
export interface CompanyOfficialInfo {
  summary: string;
  products: string[];
  recentNews: string[];
}

export interface CompanyDto {
  id: string;
  userId: string;
  name: string;
  industry: string | null;
  officialInfo: CompanyOfficialInfo | null;
  unofficialInfo: Record<string, unknown> | null;
  keyCompetencies: string[];
  analyzedAt: string | null;
  createdAt: string;
}

export interface MatchingScoreDto {
  score: number;                      // 0~100
  matchedKeywords: string[];          // 매칭된 역량 키워드
  missingKeywords: string[];          // 부족한 역량 키워드
  summary: string;                    // 한 줄 요약
}
```

### Step 2: company Zod 스키마 작성

`packages/shared/src/schemas/company.schema.ts`:
```typescript
import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(1, '기업명을 입력하세요.').max(100),
  industry: z.string().max(50).optional(),
});

export const analyzeCompanySchema = z.object({
  name: z.string().min(1, '기업명을 입력하세요.').max(100),
  jobTitle: z.string().max(100).optional(),
  additionalContext: z.string().max(1000).optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type AnalyzeCompanyInput = z.infer<typeof analyzeCompanySchema>;
```

### Step 3: index.ts에 re-export 추가

`packages/shared/src/index.ts`에 다음 줄을 추가:
```typescript
export * from './types/company';
export * from './schemas/company.schema';
```

### Step 4: 타입 체크

```bash
cd packages/shared && pnpm build
```

Expected: 에러 없음.

### Step 5: 커밋

```bash
git add packages/shared/src/types/company.ts packages/shared/src/schemas/company.schema.ts packages/shared/src/index.ts
git commit -m "feat(shared): add Company types and schemas"
```

## Acceptance Criteria

```bash
cd packages/shared && pnpm build
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
- 각 앱(apps/api, apps/web)에서 Company 타입을 독자적으로 재정의하지 마라
