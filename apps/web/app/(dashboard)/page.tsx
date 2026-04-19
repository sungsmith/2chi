'use client';

import { useExperiences } from '@/hooks/use-experiences';
import { useCoverLetters } from '@/hooks/use-cover-letters';
import { useApplications } from '@/hooks/use-applications';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: experiences } = useExperiences();
  const { data: coverLetters } = useCoverLetters();
  const { data: applications } = useApplications();

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
    </div>
  );
}
