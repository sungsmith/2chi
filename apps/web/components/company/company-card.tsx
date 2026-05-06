import Link from 'next/link';
import { Building2 } from 'lucide-react';
import type { CompanyDto } from '@2chi/shared';

export function CompanyCard({ company }: { company: CompanyDto }) {
  const isAnalyzed = !!company.analyzedAt;

  return (
    <Link href={`/company/${company.id}`}>
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 rounded-md">
            <Building2 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-slate-900">{company.name}</h3>
            {company.industry && (
              <p className="text-xs text-slate-500 mt-0.5">{company.industry}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                isAnalyzed ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {isAnalyzed ? '분석 완료' : '미분석'}
              </span>
              {company.keyCompetencies.length > 0 && (
                <span className="text-xs text-slate-400">
                  역량 {company.keyCompetencies.length}개
                </span>
              )}
            </div>
          </div>
        </div>
        {company.keyCompetencies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {company.keyCompetencies.slice(0, 4).map((c, i) => (
              <span key={i} className="rounded-md bg-blue-50 text-blue-700 text-xs px-2 py-0.5">
                {c}
              </span>
            ))}
            {company.keyCompetencies.length > 4 && (
              <span className="text-xs text-slate-400 self-center">
                +{company.keyCompetencies.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
