# Step 0: shared-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/packages/shared/src/types/application.ts` — ApplicationStage, ApplicationResult enum 값 확인
- `/packages/shared/src/index.ts` — export 패턴 확인
- `/apps/api/prisma/schema.prisma` — Application, ApplicationStageHistory 모델 확인

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`packages/shared/src/` 아래에 지원 통계 타입을 추가한다.

### 생성할 파일

**`packages/shared/src/types/analytics.ts`**

```typescript
export interface ApplicationStatisticsDto {
  totalApplications: number;
  byStage: Record<string, number>;    // { DOCUMENT: 5, FIRST_INTERVIEW: 3, ... }
  byResult: Record<string, number>;   // { PASS: 2, FAIL: 8, PENDING: 5 }
  passRate: number;                   // 0~100 (최종 합격률 %)
  avgDaysToResult: number | null;     // 지원 → 결과까지 평균 일수 (결과가 없으면 null)
}

export interface ApplicationTrendDto {
  month: string;      // 'YYYY-MM' 형식
  count: number;      // 해당 월 지원 수
  passCount: number;  // 합격 수
}

export interface StageConversionDto {
  stage: string;           // 단계명 (예: 'DOCUMENT', 'FIRST_INTERVIEW')
  count: number;           // 해당 단계까지 도달한 지원 수
  conversionRate: number;  // 이전 단계 대비 전환율 0~100 (첫 단계는 100)
}

export interface AnalyticsSummaryDto {
  statistics: ApplicationStatisticsDto;
  monthlyTrend: ApplicationTrendDto[];   // 최근 6개월
  stageConversion: StageConversionDto[];
}
```

### 수정할 파일

**`packages/shared/src/index.ts`**

analytics 타입을 export에 추가:

```typescript
export * from './types/analytics';
```

## Acceptance Criteria

```bash
cd packages/shared && pnpm build
# 타입 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - `packages/shared/src/types/analytics.ts`가 생성되었는가?
   - `packages/shared/src/index.ts`에 export가 추가되었는가?
3. 성공 시 `phases/phase3-d-analytics/index.json`의 step 0을 업데이트한다:
   - `"status": "completed"`, `"summary": "AnalyticsSummaryDto, ApplicationStatisticsDto, ApplicationTrendDto, StageConversionDto 타입 packages/shared에 추가"`

## 금지사항

- 새로운 DB 모델이나 prisma schema 변경을 하지 마라. 이유: 통계는 실시간 계산으로 충분하다. YAGNI.
- ApplicationStage, ApplicationResult enum 값을 재정의하지 마라. 이유: `packages/shared/src/types/application.ts`에 이미 있다.
