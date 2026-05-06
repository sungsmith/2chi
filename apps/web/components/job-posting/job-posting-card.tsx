'use client';

import type { JobPostingDto } from '@2chi/shared';

interface JobPostingCardProps {
  posting: JobPostingDto;
}

export function JobPostingCard({ posting }: JobPostingCardProps) {
  const previewTags = posting.requiredCompetencies.slice(0, 3);
  const remaining = posting.requiredCompetencies.length - previewTags.length;
  const scrapedDate = posting.createdAt.slice(0, 10);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-slate-900 truncate">{posting.title}</h3>
          {posting.department && (
            <p className="text-xs text-slate-500 mt-0.5">{posting.department}</p>
          )}
        </div>
        <p className="text-xs text-slate-400 shrink-0">{scrapedDate}</p>
      </div>

      {previewTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {previewTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-slate-100 text-slate-600 text-xs px-2 py-1"
            >
              {tag}
            </span>
          ))}
          {remaining > 0 && (
            <span className="rounded-md bg-slate-100 text-slate-400 text-xs px-2 py-1">
              +{remaining}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
