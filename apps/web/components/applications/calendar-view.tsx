'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCalendarEvents, useDeleteCalendarEvent } from '@/hooks/use-calendar';
import { cn } from '@/lib/utils';

const EVENT_TYPE_CONFIG = {
  DEADLINE: { label: '마감', className: 'bg-red-50 text-red-600' },
  INTERVIEW: { label: '면접', className: 'bg-blue-50 text-blue-700' },
  OTHER: { label: '기타', className: 'bg-slate-100 text-slate-600' },
} as const;

export function CalendarView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const { data: events, isLoading } = useCalendarEvents(year, month);
  const deleteEvent = useDeleteCalendarEvent();

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={prevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-lg font-semibold text-slate-900">
          {year}년 {month}월
        </span>
        <Button variant="ghost" size="sm" onClick={nextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {events?.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">이번 달 일정이 없습니다.</p>
        </div>
      )}

      <div className="space-y-2">
        {events?.map((event) => {
          const config = EVENT_TYPE_CONFIG[event.eventType];
          return (
            <div
              key={event.id}
              className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-3 shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <span className={cn('rounded-full text-xs font-medium px-2.5 py-0.5', config.className)}>
                  {config.label}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{event.title}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(event.scheduledAt).toLocaleDateString('ko-KR', {
                      month: 'long', day: 'numeric', weekday: 'short'
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteEvent.mutate(event.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
