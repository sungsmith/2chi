import { LayoutTemplate, Trash2 } from 'lucide-react';
import type { PortfolioDto } from '@2chi/shared';

const SECTION_TYPE_LABEL: Record<string, string> = {
  INTRO: '소개',
  PROJECT: '프로젝트',
  SKILLS: '기술',
  ACHIEVEMENT: '성과',
  CUSTOM: '기타',
};

const TEMPLATE_LABEL: Record<string, string> = {
  basic: '기본',
  modern: '모던',
  minimal: '미니멀',
};

interface PortfolioCardProps {
  portfolio: PortfolioDto;
  onClick: () => void;
  onDelete: () => void;
}

export function PortfolioCard({ portfolio, onClick, onDelete }: PortfolioCardProps) {
  const sectionCount = portfolio.sections?.length ?? 0;

  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow cursor-pointer group relative"
      onClick={onClick}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
        aria-label="삭제"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <LayoutTemplate className="w-4 h-4 text-slate-400 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900 truncate">{portfolio.title}</h3>
            {portfolio.versionLabel && (
              <span className="inline-block rounded-full text-xs font-medium px-2.5 py-0.5 bg-slate-100 text-slate-600">
                {portfolio.versionLabel}
              </span>
            )}
            {portfolio.templateId && (
              <span className="inline-block rounded-full text-xs font-medium px-2.5 py-0.5 bg-blue-50 text-blue-700">
                {TEMPLATE_LABEL[portfolio.templateId] ?? portfolio.templateId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-500">섹션 {sectionCount}개</span>
            <span className="text-xs text-slate-400">
              {new Date(portfolio.updatedAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          {sectionCount > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {portfolio.sections.slice(0, 4).map((section) => (
                <span
                  key={section.id}
                  className="rounded-md bg-slate-100 text-slate-600 text-xs px-2 py-0.5"
                >
                  {SECTION_TYPE_LABEL[section.type] ?? section.type}
                </span>
              ))}
              {sectionCount > 4 && (
                <span className="text-xs text-slate-400 py-0.5">+{sectionCount - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
