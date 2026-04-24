'use client';

import { ApplicationCard } from './application-card';
import type { ApplicationDto, ApplicationStage } from '@2chi/shared';

const STAGE_COLUMNS: { key: ApplicationStage; label: string }[] = [
  { key: 'DOCUMENT', label: '서류' },
  { key: 'FIRST_INTERVIEW', label: '1차 면접' },
  { key: 'SECOND_INTERVIEW', label: '2차 면접' },
  { key: 'CUSTOM', label: '기타' },
  { key: 'OFFER', label: '오퍼' },
  { key: 'DONE', label: '완료' },
];

interface Props {
  applications: ApplicationDto[];
}

export function ApplicationBoard({ applications }: Props) {
  const byStage = STAGE_COLUMNS.reduce<Record<string, ApplicationDto[]>>(
    (acc, { key }) => {
      acc[key] = applications.filter((a) => a.currentStage === key);
      return acc;
    },
    {},
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGE_COLUMNS.map(({ key, label }) => (
        <div key={key} className="flex-none w-56">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
            <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
              {byStage[key].length}
            </span>
          </div>
          <div className="space-y-2 min-h-16">
            {byStage[key].map((app) => (
              <ApplicationCard key={app.id} application={app} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
