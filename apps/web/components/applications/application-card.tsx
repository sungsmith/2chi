'use client';

import { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeleteApplication } from '@/hooks/use-applications';
import { EditApplicationModal } from './edit-application-modal';
import type { ApplicationDto } from '@2chi/shared';

const RESULT_CONFIG = {
  PASS: { label: '합격', className: 'text-green-600 bg-green-50' },
  FAIL: { label: '불합격', className: 'text-red-500 bg-red-50' },
  PENDING: { label: '대기', className: 'text-amber-600 bg-amber-50' },
  WITHDRAWN: { label: '포기', className: 'text-slate-500 bg-slate-100' },
} as const;

export function ApplicationCard({ application }: { application: ApplicationDto }) {
  const delete_ = useDeleteApplication();
  const [showEdit, setShowEdit] = useState(false);
  const result = application.result ? RESULT_CONFIG[application.result] : null;

  const displayName =
    application.company?.name ??
    application.memo ??
    application.jobPosting?.title ??
    '(미입력)';

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm group">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
            {application.jobPosting && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {application.jobPosting.title}
              </p>
            )}
            {application.appliedAt && (
              <p className="text-xs text-slate-400 mt-1">
                지원일: {new Date(application.appliedAt).toLocaleDateString('ko-KR')}
              </p>
            )}
            {application.jobPosting?.deadline && (
              <p className="text-xs text-slate-400">
                마감: {new Date(application.jobPosting.deadline).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowEdit(true)}
              className="text-slate-400 hover:text-blue-500 p-1"
              aria-label="수정"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (confirm('이 지원 현황을 삭제할까요?')) delete_.mutate(application.id);
              }}
              className="text-slate-400 hover:text-red-500 p-1"
              aria-label="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {result && (
          <span
            className={cn(
              'inline-block mt-2 rounded-full text-xs font-medium px-2.5 py-0.5',
              result.className,
            )}
          >
            {result.label}
          </span>
        )}
      </div>

      {showEdit && (
        <EditApplicationModal application={application} onClose={() => setShowEdit(false)} />
      )}
    </>
  );
}
