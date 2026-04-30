'use client';

import { Trash2 } from 'lucide-react';
import type { ResumeProfileDto } from '@2chi/shared';

interface ResumeProfileCardProps {
  profile: ResumeProfileDto;
  onClick: () => void;
  onDelete: () => void;
}

export function ResumeProfileCard({ profile, onClick, onDelete }: ResumeProfileCardProps) {
  const updatedAt = profile.updatedAt.slice(0, 10);

  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm group cursor-pointer hover:border-slate-300 transition-colors relative"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{profile.name}</h3>
          {profile.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{profile.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-400">
              경험 {profile.selectedExperienceIds.length}개 선택
            </span>
            <span className="text-xs text-slate-400">{updatedAt} 수정</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1 shrink-0"
          aria-label="삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
