'use client';

import { useParams } from 'next/navigation';
import { Building2, RefreshCw, Briefcase, BarChart2 } from 'lucide-react';
import { CompetencyList } from '@/components/company/competency-list';
import { AnalyzeForm } from '@/components/company/analyze-form';
import { useCompany } from '@/hooks/use-companies';
import type { CompanyJobInfo, CompetencyGapDto } from '@2chi/shared';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading } = useCompany(id);

  if (isLoading) return <div className="text-sm text-slate-500">불러오는 중...</div>;
  if (!company) return <div className="text-sm text-red-500">기업 정보를 찾을 수 없습니다.</div>;

  const jobInfo = company.jobInfo as CompanyJobInfo | null;
  const gapResult = company.gapResult as CompetencyGapDto | null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* 헤더 */}
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

      {/* 기업 공식 정보 */}
      {company.officialInfo && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900">기업 정보</h2>
          {company.officialInfo.summary && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">기업 요약</p>
              <p className="text-sm text-slate-700 leading-relaxed">{company.officialInfo.summary}</p>
            </div>
          )}
          {company.officialInfo.culture && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">조직 문화</p>
              <p className="text-sm text-slate-700 leading-relaxed">{company.officialInfo.culture}</p>
            </div>
          )}
          {company.officialInfo.products && company.officialInfo.products.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">주요 제품/서비스</p>
              <ul className="space-y-1">
                {company.officialInfo.products.map((p, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-400">•</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {company.officialInfo.recentNews && company.officialInfo.recentNews.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">최근 동향</p>
              <ul className="space-y-1">
                {company.officialInfo.recentNews.map((n, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-400">•</span>{n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 직무 분석 — 채용공고 첨부 시에만 표시 */}
      {jobInfo && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">직무 분석</h2>
            {jobInfo.jobTitle && (
              <span className="ml-auto text-sm text-slate-500 font-medium">{jobInfo.jobTitle}</span>
            )}
          </div>
          {jobInfo.jobSummary && (
            <p className="text-sm text-slate-600">{jobInfo.jobSummary}</p>
          )}
          {jobInfo.requiredCompetencies.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">필수 역량</p>
              <div className="flex flex-wrap gap-1.5">
                {jobInfo.requiredCompetencies.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {jobInfo.preferredCompetencies.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">우대 역량</p>
              <div className="flex flex-wrap gap-1.5">
                {jobInfo.preferredCompetencies.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 핵심 역량 */}
      {company.keyCompetencies.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <CompetencyList competencies={company.keyCompetencies} />
        </div>
      )}

      {/* 갭 분석 결과 — 자동 계산 */}
      {gapResult ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">역량 갭 분석</h2>
            <span className={`ml-auto text-lg font-bold ${gapResult.score >= 70 ? 'text-green-600' : gapResult.score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
              {gapResult.score}점
            </span>
          </div>
          <p className="text-sm text-slate-600">{gapResult.summary}</p>
          {gapResult.myMatched.length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">보유 역량 ✓</p>
              <div className="flex flex-wrap gap-1.5">
                {gapResult.myMatched.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {gapResult.myMissing.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">보강 필요 역량</p>
              <div className="flex flex-wrap gap-1.5">
                {gapResult.myMissing.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-500">역량 갭 분석</h2>
          </div>
          <p className="text-sm text-slate-400">
            채용공고를 포함해 재분석하면 갭 분석 결과가 자동으로 표시됩니다.
          </p>
        </div>
      )}

      {/* 재분석 */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          재분석
        </h2>
        <AnalyzeForm />
      </div>
    </div>
  );
}
