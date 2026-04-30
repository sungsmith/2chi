# Step 3: analytics-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/UI_GUIDE.md`
- `/apps/web/app/(dashboard)/page.tsx` — 대시보드 홈 페이지 (통계 섹션 추가할 위치)
- `/apps/web/hooks/use-analytics.ts` — Step 2에서 생성한 훅
- `/packages/shared/src/types/analytics.ts` — Step 0에서 생성한 타입

이전 steps 완료 summary:
- Step 0: AnalyticsSummaryDto, ApplicationStatisticsDto, ApplicationTrendDto, StageConversionDto 타입 packages/shared에 추가
- Step 1: analytics NestJS 모듈 생성 — GET /analytics/summary 엔드포인트, 실시간 통계 계산 포함
- Step 2: use-analytics.ts 생성 — useAnalyticsSummary 훅, 5분 캐시

## 작업

지원 패턴 분석 UI를 구현한다. 별도 `/analytics` 페이지 없이 **대시보드 홈에 통계 섹션을 추가**한다.

### 패키지 설치

```bash
cd apps/web && pnpm add recharts
```

### 생성할 파일

**`apps/web/components/analytics/statistics-cards.tsx`**

4개의 통계 카드 컴포넌트. `ApplicationStatisticsDto`를 props로 받는다:

```typescript
interface StatisticsCardsProps {
  statistics: ApplicationStatisticsDto;
}
```

카드 4개:
1. **총 지원 수** — `statistics.totalApplications`
2. **합격률** — `statistics.passRate.toFixed(1) + '%'`
3. **진행 중** — `statistics.byResult['PENDING'] ?? 0` 건
4. **평균 소요 기간** — `statistics.avgDaysToResult ? `${Math.round(statistics.avgDaysToResult)}일` : '-'`

shadcn/ui Card 컴포넌트 사용. 각 카드에 아이콘(lucide-react)과 수치 표시.

**`apps/web/components/analytics/monthly-trend-chart.tsx`**

```typescript
interface MonthlyTrendChartProps {
  data: ApplicationTrendDto[];
}
```

recharts BarChart:
- X축: month ('YYYY-MM')
- Y축: 지원 수
- Bar 1: 전체 지원 수 (파란색)
- Bar 2: 합격 수 (초록색)
- Tooltip과 Legend 포함

**`apps/web/components/analytics/stage-conversion-table.tsx`**

```typescript
interface StageConversionTableProps {
  data: StageConversionDto[];
}
```

단계별 전환율을 테이블로 표시:
- 컬럼: 단계명 (한국어로 표시), 도달 수, 전환율 (%)
- 단계명 매핑: DOCUMENT→서류, FIRST_INTERVIEW→1차 면접, SECOND_INTERVIEW→2차 면접, FINAL_INTERVIEW→최종 면접, OFFER→합격

### 수정할 파일

**`apps/web/app/(dashboard)/page.tsx`**

기존 대시보드 홈에 아래 섹션을 추가한다:

```tsx
// useAnalyticsSummary 훅으로 데이터 조회
const { data: analytics, isLoading } = useAnalyticsSummary();

// 기존 콘텐츠 하단에 추가
<section className="mt-8">
  <h2 className="text-lg font-semibold mb-4">지원 현황 분석</h2>
  {isLoading ? (
    <div>로딩 중...</div>
  ) : analytics ? (
    <div className="space-y-6">
      <StatisticsCards statistics={analytics.statistics} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyTrendChart data={analytics.monthlyTrend} />
        <StageConversionTable data={analytics.stageConversion} />
      </div>
    </div>
  ) : null}
</section>
```

## Acceptance Criteria

```bash
cd apps/web && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - `recharts`가 정상적으로 import되는가?
   - 대시보드 홈에 통계 섹션이 추가되었는가?
   - StatisticsCards, MonthlyTrendChart, StageConversionTable 컴포넌트가 빌드 에러 없이 컴파일되는가?
3. 성공 시 `phases/phase3-d-analytics/index.json`의 step 3을 업데이트한다:
   - `"status": "completed"`, `"summary": "대시보드 홈에 통계 섹션 추가 — 4개 요약 카드, 월별 추이 차트(recharts), 단계 전환율 테이블"`

## 금지사항

- 별도 `/analytics` 페이지를 만들지 마라. 이유: 대시보드 홈에 통합하는 것이 더 자연스럽다.
- recharts 외 차트 라이브러리를 추가하지 마라. 이유: 의존성 최소화 원칙.
- Glass morphism, gradient, 글로우 효과 사용 금지.
- 기존 대시보드 홈의 콘텐츠를 제거하거나 변경하지 마라. 이유: 통계 섹션은 기존 콘텐츠 하단에 추가한다.
