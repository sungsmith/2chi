'use client';

import type { ExperienceDto } from '@2chi/shared';

const TYPE_LABEL: Record<string, string> = {
  WORK: '경력',
  PROJECT: '프로젝트',
  ACTIVITY: '활동',
  EDUCATION: '학력',
};

const TYPE_COLOR: Record<string, string> = {
  WORK: 'bg-blue-100 text-blue-700',
  PROJECT: 'bg-purple-100 text-purple-700',
  ACTIVITY: 'bg-green-100 text-green-700',
  EDUCATION: 'bg-amber-100 text-amber-700',
};

interface ExperienceSelectorProps {
  experiences: ExperienceDto[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ExperienceSelector({ experiences, selectedIds, onChange }: ExperienceSelectorProps) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (experiences.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        등록된 이력이 없습니다. 먼저 이력을 추가하세요.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {experiences.map((exp) => {
        const checked = selectedIds.includes(exp.id);
        const period = (() => {
          const start = exp.startDate?.slice(0, 7);
          const end = exp.isCurrent ? '현재' : exp.endDate?.slice(0, 7);
          if (!start && !end) return null;
          return `${start ?? ''} ~ ${end ?? ''}`;
        })();

        return (
          <label
            key={exp.id}
            className="flex items-start gap-3 bg-white rounded-lg border border-slate-200 p-4 cursor-pointer hover:border-slate-300 transition-colors"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(exp.id)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-block rounded-full text-xs font-medium px-2.5 py-0.5 ${TYPE_COLOR[exp.type] ?? 'bg-slate-100 text-slate-600'}`}
                >
                  {TYPE_LABEL[exp.type] ?? exp.type}
                </span>
                <span className="text-sm font-medium text-slate-900 truncate">{exp.title}</span>
              </div>
              {exp.companyName && (
                <p className="text-xs text-slate-500 mt-0.5">{exp.companyName}</p>
              )}
              {period && <p className="text-xs text-slate-400 mt-0.5">{period}</p>}
            </div>
          </label>
        );
      })}
    </div>
  );
}
