import { FileText } from 'lucide-react';
import type { CareerDescriptionDto } from '@2chi/shared';

const SECTION_TYPE_LABEL: Record<string, string> = {
  INTRO: '소개',
  EXPERIENCE: '경험',
  SKILL: '기술',
  ACHIEVEMENT: '성과',
  CUSTOM: '기타',
};

interface CareerDescCardProps {
  careerDescription: CareerDescriptionDto;
  onClick: () => void;
}

export function CareerDescCard({ careerDescription, onClick }: CareerDescCardProps) {
  const sectionCount = careerDescription.sections?.length ?? 0;
  const hasPdf = !!careerDescription.pdfUrl;

  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900 truncate">
              {careerDescription.title}
            </h3>
            {careerDescription.versionLabel && (
              <span className="inline-block rounded-full text-xs font-medium px-2.5 py-0.5 bg-slate-100 text-slate-600">
                {careerDescription.versionLabel}
              </span>
            )}
            {hasPdf && (
              <span className="inline-block rounded-full text-xs font-medium px-2.5 py-0.5 bg-green-50 text-green-700">
                PDF
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-500">
              섹션 {sectionCount}개
            </span>
            {careerDescription.targetJobType && (
              <span className="text-xs text-slate-400">{careerDescription.targetJobType}</span>
            )}
            <span className="text-xs text-slate-400">
              {new Date(careerDescription.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          {sectionCount > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {careerDescription.sections.slice(0, 4).map((section) => (
                <span
                  key={section.id}
                  className="rounded-md bg-slate-100 text-slate-600 text-xs px-2 py-0.5"
                >
                  {SECTION_TYPE_LABEL[section.sectionType] ?? section.sectionType}
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
