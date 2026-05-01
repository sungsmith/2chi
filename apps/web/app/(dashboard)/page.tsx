'use client';

import { useExperiences } from '@/hooks/use-experiences';
import { useCoverLetters } from '@/hooks/use-cover-letters';
import { useApplications } from '@/hooks/use-applications';
import { useAnalyticsSummary } from '@/hooks/use-analytics';
import { StatisticsCards } from '@/components/analytics/statistics-cards';
import { MonthlyTrendChart } from '@/components/analytics/monthly-trend-chart';
import { StageConversionTable } from '@/components/analytics/stage-conversion-table';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: experiences } = useExperiences();
  const { data: coverLetters } = useCoverLetters();
  const { data: applications } = useApplications();
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsSummary();

  const activeApplications = applications?.filter(
    (a) => a.currentStage !== 'DONE' && a.result !== 'FAIL' && a.result !== 'WITHDRAWN',
  ).length ?? 0;

  const stats = [
    { label: '내 이력', value: experiences?.length ?? '—', href: '/experience' },
    { label: '자소서', value: coverLetters?.length ?? '—', href: '/cover-letter' },
    { label: '진행 중인 지원', value: applications !== undefined ? activeApplications : '—', href: '/applications' },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">대시보드</h1>
      <p className="text-sm text-slate-500 mb-8">취업 준비 현황을 한눈에 확인하세요.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, href }) => (
          <Link key={label} href={href}>
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-semibold text-slate-900 mt-2">{value}</p>
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">지원 현황 분석</h2>
        {analyticsLoading ? (
          <div className="text-sm text-slate-400">로딩 중...</div>
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
    </div>
  );
}
