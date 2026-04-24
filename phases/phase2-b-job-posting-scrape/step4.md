# Step 4: job-posting-scrape-hooks

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `apps/web/hooks/use-cover-letters.ts` — TanStack Query 훅 패턴
- `apps/web/lib/api.ts` — API 클라이언트 구조
- `packages/shared/src/types/cover-letter.ts` — JobPostingDto, CompetencyGapDto
- `packages/shared/src/schemas/cover-letter.schema.ts` — scrapeJobPostingSchema

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

채용공고 URL 스크랩과 역량 갭 분석 관련 TanStack Query 훅을 생성한다.

### 생성할 파일

#### `apps/web/hooks/use-job-postings.ts`

```typescript
const JP_KEY = ['job-postings'] as const;

export function useJobPostings()           // GET /job-postings
export function useJobPosting(id: string)  // GET /job-postings/:id
export function useScrapeJobPosting()      // POST /job-postings/scrape (mutation)
export function useParseJobPosting()       // POST /job-postings/parse (mutation, 텍스트 붙여넣기)
export function useDeleteJobPosting()      // DELETE /job-postings/:id (mutation)
```

#### `apps/web/hooks/use-companies.ts` 수정 (또는 use-company-gap.ts 생성)

기존 `use-companies.ts` 파일을 읽어 구조를 파악한 후, 역량 갭 분석 훅을 추가한다:

```typescript
// POST /companies/:id/gap-analysis
export function useCompetencyGapAnalysis()
// mutation: { companyId: string; jobPostingId: string } → CompetencyGapDto
```

## Acceptance Criteria

```bash
cd apps/web && pnpm lint
cd apps/web && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `use-job-postings.ts`가 `use-cover-letters.ts`와 동일한 쿼리 키 패턴을 사용하는가?
   - `useScrapeJobPosting` 성공 시 JP_KEY 캐시가 무효화되는가?
3. 결과에 따라 `phases/phase2-b-job-posting-scrape/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "use-job-postings.ts 생성, useCompetencyGapAnalysis 훅 추가 완료"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- `use-job-postings.ts`를 `use-cover-letters.ts`에 합치지 마라. 이유: 도메인이 다른 훅은 파일을 분리해야 한다.
- `useCompetencyGapAnalysis`를 query(useQuery)로 구현하지 마라. 이유: 갭 분석은 사용자가 명시적으로 트리거하는 작업이므로 mutation이 적합하다.
