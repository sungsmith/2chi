'use client';

import { useState } from 'react';
import { CompanyCard } from '@/components/company/company-card';
import { AnalyzeForm } from '@/components/company/analyze-form';
import { useCompanies } from '@/hooks/use-companies';
import type { CompanyDto } from '@2chi/shared';

export default function CompanyListPage() {
  const { data: companies, isLoading } = useCompanies();
  const [latestAnalyzed, setLatestAnalyzed] = useState<CompanyDto | null>(null);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">기업·직무 분석</h1>
        <p className="text-sm text-slate-500 mt-0.5">기업을 분석하고 필요 역량을 파악하세요.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">새 기업 분석</h2>
        <AnalyzeForm onAnalyzed={setLatestAnalyzed} />
        {latestAnalyzed && (
          <div className="mt-4 p-3 bg-green-50 rounded-md text-sm text-green-700">
            <span className="font-medium">{latestAnalyzed.name}</span> 분석 완료.{' '}
            <a href={`/company/${latestAnalyzed.id}`} className="underline">
              결과 보기 →
            </a>
          </div>
        )}
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {companies?.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">분석한 기업이 없습니다.</p>
          <p className="text-xs mt-1">위에서 기업명을 입력해 분석을 시작하세요.</p>
        </div>
      )}

      <div className="grid gap-3">
        {companies?.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>
    </div>
  );
}
