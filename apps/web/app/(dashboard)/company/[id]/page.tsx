'use client';

import { useParams } from 'next/navigation';
import { Building2, RefreshCw } from 'lucide-react';
import { CompetencyList } from '@/components/company/competency-list';
import { AnalyzeForm } from '@/components/company/analyze-form';
import { useCompany } from '@/hooks/use-companies';
import type { CompanyDto } from '@2chi/shared';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading, refetch } = useCompany(id);

  if (isLoading) return <div className="text-sm text-slate-500">불러오는 중...</div>;
  if (!company) return <div className="text-sm text-red-500">기업 정보를 찾을 수 없습니다.</div>;

  const officialInfo = company.officialInfo as {
    summary?: string;
    products?: string[];
    recentNews?: string[];
  } | null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-5 h-5 text-slate-500" />
          <h1 className="text-2xl font-semibold text-slate-900">{company.name}</h1>
        </div>
        {company.analyzedAt && (
          <p className="text-xs text-slate-400">
            분석일: {new Date(company.analyzedAt).toLocaleDateString('ko-KR')}
          </p>
        )}
      </div>

      {officialInfo && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          {officialInfo.summary && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">기업 요약</p>
              <p className="text-sm text-slate-700 leading-relaxed">{officialInfo.summary}</p>
            </div>
          )}
          {officialInfo.products && officialInfo.products.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">주요 제품/서비스</p>
              <ul className="space-y-1">
                {officialInfo.products.map((p, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-400">•</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {officialInfo.recentNews && officialInfo.recentNews.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">최근 동향</p>
              <ul className="space-y-1">
                {officialInfo.recentNews.map((n, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-400">•</span>{n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {company.keyCompetencies.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <CompetencyList competencies={company.keyCompetencies} />
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          재분석
        </h2>
        <AnalyzeForm />
      </div>
    </div>
  );
}
