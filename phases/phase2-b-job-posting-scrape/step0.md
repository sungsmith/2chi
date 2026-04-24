# Step 0: shared-job-posting-scrape-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md`
- `packages/shared/src/types/cover-letter.ts` — 기존 JobPostingDto 확인
- `packages/shared/src/schemas/cover-letter.schema.ts` — 기존 parseJobPostingSchema 확인
- `packages/shared/src/index.ts`
- `apps/api/prisma/schema.prisma` — JobPosting, Company 모델 확인

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

채용공고 URL 스크랩과 기업·직무 역량 갭 분석에 필요한 타입과 Zod 스키마를 추가한다.

### 수정할 파일

#### `packages/shared/src/schemas/cover-letter.schema.ts`

기존 `parseJobPostingSchema` 아래에 URL 스크랩 스키마를 추가한다:

```typescript
export const scrapeJobPostingSchema = z.object({
  url: z.string().url('올바른 URL을 입력하세요.'),
});

export type ScrapeJobPostingInput = z.infer<typeof scrapeJobPostingSchema>;
```

#### `packages/shared/src/types/cover-letter.ts`

기존 타입 아래에 역량 갭 분석 결과 타입을 추가한다:

```typescript
export interface CompetencyGapDto {
  required: string[];      // 채용공고 필수 역량
  preferred: string[];     // 우대 역량
  myMatched: string[];     // 내 이력과 매칭된 역량
  myMissing: string[];     // 내 이력에서 부족한 역량
  score: number;           // 0-100
  summary: string;
}
```

#### `packages/shared/src/index.ts`

새로 추가된 타입(`ScrapeJobPostingInput`, `CompetencyGapDto`)이 export되는지 확인한다. 이미 `cover-letter.ts`와 `cover-letter.schema.ts`가 export되어 있으면 별도 추가 불필요.

## Acceptance Criteria

```bash
cd packages/shared && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - 기존 `parseJobPostingSchema`가 변경되지 않았는가? (기존 텍스트 붙여넣기 기능 유지 필요)
   - `CompetencyGapDto`가 index.ts에서 export되는가?
3. 결과에 따라 `phases/phase2-b-job-posting-scrape/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "scrapeJobPostingSchema, CompetencyGapDto 추가 완료"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- 기존 `parseJobPostingSchema`를 삭제하거나 변경하지 마라. 이유: phase1-c에서 구현한 텍스트 붙여넣기 파싱 기능이 이 스키마에 의존한다.
- `apps/api` 또는 `apps/web` 파일을 수정하지 마라. 이유: step 0은 shared 타입만 담당한다.
