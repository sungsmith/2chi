import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalyticsSummaryDto,
  ApplicationStatisticsDto,
  ApplicationTrendDto,
  StageConversionDto,
} from '@2chi/shared';

type ApplicationWithStages = Prisma.ApplicationGetPayload<{
  include: { stages: true };
}>;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string): Promise<AnalyticsSummaryDto> {
    const applications = await this.prisma.application.findMany({
      where: { userId },
      include: {
        stages: { orderBy: { createdAt: 'asc' } },
      },
    });

    return {
      statistics: this.calcStatistics(applications),
      monthlyTrend: this.calcMonthlyTrend(applications),
      stageConversion: this.calcStageConversion(applications),
    };
  }

  private calcStatistics(applications: ApplicationWithStages[]): ApplicationStatisticsDto {
    const total = applications.length;
    const byStage: Record<string, number> = {};
    const byResult: Record<string, number> = {};

    for (const app of applications) {
      const stage = app.currentStage as string;
      byStage[stage] = (byStage[stage] ?? 0) + 1;

      const result = (app.result as string) ?? 'PENDING';
      byResult[result] = (byResult[result] ?? 0) + 1;
    }

    const passCount = byResult['PASS'] ?? 0;
    const passRate = total > 0 ? Math.round((passCount / total) * 1000) / 10 : 0;

    const appsWithResult = applications.filter(
      (app) => app.result !== null && app.appliedAt !== null,
    );
    let avgDaysToResult: number | null = null;
    if (appsWithResult.length > 0) {
      const totalDays = appsWithResult.reduce((sum: number, app) => {
        // result가 기록된 마지막 stage history의 createdAt을 결과 날짜로 사용.
        // stage history가 없으면 updatedAt으로 fallback.
        const stagesWithResult = app.stages.filter((s) => s.result !== null);
        const resultDate =
          stagesWithResult.length > 0
            ? new Date(Math.max(...stagesWithResult.map((s) => new Date(s.createdAt).getTime())))
            : new Date(app.updatedAt);
        const days =
          (resultDate.getTime() - new Date(app.appliedAt!).getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      avgDaysToResult = Math.round((totalDays / appsWithResult.length) * 10) / 10;
    }

    return { totalApplications: total, byStage, byResult, passRate, avgDaysToResult };
  }

  private calcMonthlyTrend(applications: ApplicationWithStages[]): ApplicationTrendDto[] {
    const now = new Date();
    const months: ApplicationTrendDto[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

      const appsInMonth = applications.filter((app) => {
        if (!app.appliedAt) return false;
        const applied = new Date(app.appliedAt);
        return applied.getFullYear() === year && applied.getMonth() === month;
      });

      months.push({
        month: monthStr,
        count: appsInMonth.length,
        passCount: appsInMonth.filter((app) => app.result === 'PASS').length,
      });
    }

    return months;
  }

  private calcStageConversion(applications: ApplicationWithStages[]): StageConversionDto[] {
    const stageOrder = [
      'DOCUMENT',
      'FIRST_INTERVIEW',
      'SECOND_INTERVIEW',
      'FINAL_INTERVIEW',
      'OFFER',
    ];
    const total = applications.length;

    const stageCounts = stageOrder.map((stage) => {
      if (stage === 'DOCUMENT') return total;
      return applications.filter((app) =>
        app.stages.some((s) => s.stage === stage),
      ).length;
    });

    return stageOrder.map((stage, idx) => {
      const count = stageCounts[idx];
      const prevCount = idx === 0 ? total : stageCounts[idx - 1];
      const conversionRate =
        idx === 0 ? 100 : prevCount === 0 ? 0 : Math.round((count / prevCount) * 1000) / 10;

      return { stage, count, conversionRate };
    });
  }
}
