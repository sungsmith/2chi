'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Building2, RefreshCw, BarChart2 } from 'lucide-react';
import { CompetencyList } from '@/components/company/competency-list';
import { CompetencyGap } from '@/components/company/competency-gap';
import { AnalyzeForm } from '@/components/company/analyze-form';
import { useCompany, useCompetencyGapAnalysis } from '@/hooks/use-companies';
import { useJobPostings } from '@/hooks/use-job-postings';
import type { CompetencyGapDto } from '@2chi/shared';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading, refetch } = useCompany(id);
  const { data: jobPostings = [] } = useJobPostings();
  const gapMutation = useCompetencyGapAnalysis();

  const [selectedJobPostingId, setSelectedJobPostingId] = useState('');
  const [gapResult, setGapResult] = useState<CompetencyGapDto | null>(null);

  const handleGapAnalysis = async () => {
    if (!selectedJobPostingId) return;
    const result = await gapMutation.mutateAsync({ companyId: id, jobPostingId: selectedJobPostingId });
    setGapResult(result);
  };

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

      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <BarChart2 className="w-4 h-4" />
          역량 갭 분석
        </h2>

        {jobPostings.length === 0 ? (
          <p className="text-sm text-slate-500">채용공고를 먼저 추가해주세요.</p>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedJobPostingId}
              onChange={(e) => {
                setSelectedJobPostingId(e.target.value);
                setGapResult(null);
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">채용공고 선택</option>
              {jobPostings.map((jp) => (
                <option key={jp.id} value={jp.id}>
                  {jp.title}
                </option>
              ))}
            </select>

            <button
              onClick={handleGapAnalysis}
              disabled={!selectedJobPostingId || gapMutation.isPending}
              className="rounded-md bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {gapMutation.isPending ? '분석 중...' : '갭 분석'}
            </button>

            {gapMutation.isError && (
              <p className="text-sm text-red-500">분석 중 오류가 발생했습니다. 다시 시도해주세요.</p>
            )}

            {gapResult && <CompetencyGap gap={gapResult} />}
          </div>
        )}
      </div>

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
