export interface ApplicationStatisticsDto {
  totalApplications: number;
  byStage: Record<string, number>;
  byResult: Record<string, number>;
  passRate: number;
  avgDaysToResult: number | null;
}

export interface ApplicationTrendDto {
  month: string;
  count: number;
  passCount: number;
}

export interface StageConversionDto {
  stage: string;
  count: number;
  conversionRate: number;
}

export interface AnalyticsSummaryDto {
  statistics: ApplicationStatisticsDto;
  monthlyTrend: ApplicationTrendDto[];
  stageConversion: StageConversionDto[];
}
