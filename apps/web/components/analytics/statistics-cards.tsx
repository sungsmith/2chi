'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, TrendingUp, Clock, Calendar } from 'lucide-react';
import type { ApplicationStatisticsDto } from '@2chi/shared';

interface StatisticsCardsProps {
  statistics: ApplicationStatisticsDto;
}

export function StatisticsCards({ statistics }: StatisticsCardsProps) {
  const cards = [
    {
      label: '총 지원 수',
      value: String(statistics.totalApplications),
      icon: Briefcase,
    },
    {
      label: '합격률',
      value: statistics.passRate.toFixed(1) + '%',
      icon: TrendingUp,
    },
    {
      label: '진행 중',
      value: String(statistics.byResult['PENDING'] ?? 0) + '건',
      icon: Clock,
    },
    {
      label: '평균 소요 기간',
      value: statistics.avgDaysToResult
        ? `${Math.round(statistics.avgDaysToResult)}일`
        : '-',
      icon: Calendar,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label} className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {label}
              </p>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
