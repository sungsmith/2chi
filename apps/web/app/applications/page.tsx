'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApplicationBoard } from '@/components/applications/application-board';
import { CalendarView } from '@/components/applications/calendar-view';
import { AddApplicationModal } from '@/components/applications/add-application-modal';
import { useApplications } from '@/hooks/use-applications';
import { cn } from '@/lib/utils';

type Tab = 'board' | 'calendar';

export default function ApplicationsPage() {
  const [tab, setTab] = useState<Tab>('board');
  const [showModal, setShowModal] = useState(false);
  const { data: applications, isLoading } = useApplications();

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">지원 현황</h1>
          <p className="text-sm text-slate-500 mt-0.5">지원 단계와 일정을 관리하세요.</p>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4" />
          지원 추가
        </Button>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {(['board', 'calendar'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t === 'board' ? '보드' : '캘린더'}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {tab === 'board' && applications && (
        <ApplicationBoard applications={applications} />
      )}

      {tab === 'calendar' && <CalendarView />}

      {showModal && <AddApplicationModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
