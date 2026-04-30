# Step 2: analytics-hooks

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/apps/web/hooks/use-career-descriptions.ts` — TanStack Query 훅 패턴
- `/packages/shared/src/types/analytics.ts` — Step 0에서 생성한 타입

이전 steps 완료 summary:
- Step 0: AnalyticsSummaryDto, ApplicationStatisticsDto, ApplicationTrendDto, StageConversionDto 타입 packages/shared에 추가
- Step 1: analytics NestJS 모듈 생성 — GET /analytics/summary 엔드포인트, 실시간 통계 계산 포함

## 작업

분석 TanStack Query 훅을 생성한다.

### 생성할 파일

**`apps/web/hooks/use-analytics.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { AnalyticsSummaryDto } from '@2chi/shared';

export function useAnalyticsSummary() {
  return useQuery<AnalyticsSummaryDto>({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      // GET /analytics/summary 호출
      // Authorization 헤더 포함
      // { success: true, data: AnalyticsSummaryDto } 응답에서 data 추출
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시 — 통계는 자주 변하지 않음
  });
}
```

## Acceptance Criteria

```bash
cd apps/web && pnpm build
# 타입 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - `useAnalyticsSummary`가 `AnalyticsSummaryDto`를 반환하는가?
   - staleTime이 5분으로 설정되어 있는가?
3. 성공 시 `phases/phase3-d-analytics/index.json`의 step 2를 업데이트한다:
   - `"status": "completed"`, `"summary": "use-analytics.ts 생성 — useAnalyticsSummary 훅, 5분 캐시"`
