# Step 1: analytics-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/apps/api/src/applications/applications.service.ts` — 기존 Application 쿼리 패턴
- `/apps/api/src/applications/applications.module.ts` — 모듈 구조 확인
- `/packages/shared/src/types/analytics.ts` — Step 0에서 생성한 타입
- `/packages/shared/src/types/application.ts` — ApplicationStage, ApplicationResult 값 확인
- `/apps/api/prisma/schema.prisma` — Application, ApplicationStageHistory 모델

이전 step 완료 summary: AnalyticsSummaryDto, ApplicationStatisticsDto, ApplicationTrendDto, StageConversionDto 타입 packages/shared에 추가

## 작업

지원 통계 분석 API를 구현한다. 별도 AnalyticsModule로 구현한다.

### 생성할 파일

**`apps/api/src/analytics/analytics.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsSummaryDto, ApplicationStatisticsDto, ApplicationTrendDto, StageConversionDto } from '@2chi/shared';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string): Promise<AnalyticsSummaryDto> {
    // 1. 해당 userId의 모든 Application을 stageHistories 포함하여 조회
    // 2. calcStatistics로 통계 계산
    // 3. calcMonthlyTrend로 최근 6개월 추이 계산
    // 4. calcStageConversion으로 단계 전환율 계산
    // 5. AnalyticsSummaryDto로 조합하여 반환
  }

  private calcStatistics(applications: any[]): ApplicationStatisticsDto {
    // totalApplications: applications.length
    // byStage: 현재 stage별 그룹핑
    // byResult: result별 그룹핑 (null은 'PENDING'으로 처리)
    // passRate: PASS 수 / totalApplications * 100
    // avgDaysToResult: result가 있는 지원들의 (updatedAt - appliedAt) 평균 일수
  }

  private calcMonthlyTrend(applications: any[]): ApplicationTrendDto[] {
    // 최근 6개월 각각에 대해:
    // - month: 'YYYY-MM' 형식
    // - count: 해당 월에 지원한 수 (appliedAt 기준)
    // - passCount: 해당 월에 지원하여 PASS된 수
    // 데이터가 없는 월은 count: 0, passCount: 0으로 포함
  }

  private calcStageConversion(applications: any[]): StageConversionDto[] {
    // 단계 순서: DOCUMENT → FIRST_INTERVIEW → SECOND_INTERVIEW → FINAL_INTERVIEW → OFFER
    // 각 단계별 도달한 지원 수를 집계
    // conversionRate: 이전 단계 대비 현재 단계 비율 (첫 단계는 100)
  }
}
```

**`apps/api/src/analytics/analytics.controller.ts`**

```typescript
import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  @Get('summary')
  async getSummary(@Req() req: any) {
    const data = await this.analyticsService.getSummary(req.user.id);
    return { success: true, data };
  }
}
```

**`apps/api/src/analytics/analytics.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
```

### 수정할 파일

**`apps/api/src/app.module.ts`** — `AnalyticsModule` import 추가

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
cd apps/api && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - userId 필터가 getSummary에 적용되는가?
   - `app.module.ts`에 `AnalyticsModule`이 추가되었는가?
   - 빌드가 에러 없이 통과하는가?
3. 성공 시 `phases/phase3-d-analytics/index.json`의 step 1을 업데이트한다:
   - `"status": "completed"`, `"summary": "analytics NestJS 모듈 생성 — GET /analytics/summary 엔드포인트, 실시간 통계 계산 포함"`

## 금지사항

- Raw SQL 또는 `$queryRaw`를 사용하지 마라. 이유: 모든 DB 쿼리는 Prisma를 통해야 한다.
- 분석 결과를 DB에 캐싱하지 마라. 이유: 데이터 양이 적으므로 실시간 계산으로 충분하다. YAGNI.
- ApplicationsModule을 수정하지 마라. 이유: 별도 AnalyticsModule로 독립적으로 구현한다.
