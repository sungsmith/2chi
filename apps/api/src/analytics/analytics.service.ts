import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalyticsSummaryDto,
  ApplicationStatisticsDto,
  ApplicationTrendDto,
  StageConversionDto,
} from '@2chi/shared';

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

  private calcStatistics(applications: any[]): ApplicationStatisticsDto {
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
      const totalDays = appsWithResult.reduce((sum: number, app: any) => {
        const days =
          (new Date(app.updatedAt).getTime() - new Date(app.appliedAt).getTime()) /
          (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      avgDaysToResult = Math.round((totalDays / appsWithResult.length) * 10) / 10;
    }

    return { totalApplications: total, byStage, byResult, passRate, avgDaysToResult };
  }

  private calcMonthlyTrend(applications: any[]): ApplicationTrendDto[] {
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

  private calcStageConversion(applications: any[]): StageConversionDto[] {
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
        app.stages.some((s: any) => s.stage === stage),
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
