'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCalendarEvents, useDeleteCalendarEvent } from '@/hooks/use-calendar';
import { useApplications } from '@/hooks/use-applications';
import { cn } from '@/lib/utils';

const EVENT_TYPE_CONFIG = {
  DEADLINE: { label: '마감', dotClass: 'bg-red-500' },
  INTERVIEW: { label: '면접', dotClass: 'bg-blue-500' },
  OTHER: { label: '기타', dotClass: 'bg-slate-400' },
} as const;

const EVENT_TYPE_BADGE = {
  DEADLINE: 'bg-red-50 text-red-600',
  INTERVIEW: 'bg-blue-50 text-blue-700',
  OTHER: 'bg-slate-100 text-slate-600',
} as const;

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

type ViewMode = 'grid' | 'list';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  eventType: 'DEADLINE' | 'INTERVIEW' | 'OTHER' | 'APPLICATION_DEADLINE';
  sourceId: string;
}

function buildCalendarGrid(year: number, month: number): Date[] {
  // month is 1-based
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startOffset = firstDay.getDay(); // 0=Sun
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const cells: Date[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(year, month - 1, 1 - startOffset + i);
    cells.push(d);
  }
  return cells;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function CalendarView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [view, setView] = useState<ViewMode>('grid');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: calendarEvents, isLoading: eventsLoading } = useCalendarEvents(year, month);
  const { data: applications } = useApplications();
  const deleteEvent = useDeleteCalendarEvent();

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  // Build unified event list
  const allEvents: CalendarEvent[] = [];

  if (calendarEvents) {
    for (const e of calendarEvents) {
      const dateStr = e.scheduledAt.slice(0, 10);
      allEvents.push({
        id: e.id,
        title: e.title,
        date: dateStr,
        eventType: e.eventType,
        sourceId: e.id,
      });
    }
  }

  if (applications) {
    for (const app of applications) {
      const deadline = app.jobPosting?.deadline;
      if (!deadline) continue;
      const dateStr = deadline.slice(0, 10);
      const [y, m] = dateStr.split('-').map(Number);
      if (y === year && m === month) {
        const companyName = app.company?.name ?? app.jobPosting?.title ?? '지원';
        allEvents.push({
          id: `app-${app.id}`,
          title: `${companyName} 마감`,
          date: dateStr,
          eventType: 'APPLICATION_DEADLINE',
          sourceId: app.id,
        });
      }
    }
  }

  const eventsByDate = allEvents.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {});

  const todayStr = toDateStr(new Date());
  const cells = buildCalendarGrid(year, month);

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  function getDotClass(eventType: CalendarEvent['eventType']): string {
    if (eventType === 'APPLICATION_DEADLINE') return 'bg-orange-500';
    return EVENT_TYPE_CONFIG[eventType]?.dotClass ?? 'bg-slate-400';
  }

  function getBadgeClass(eventType: CalendarEvent['eventType']): string {
    if (eventType === 'APPLICATION_DEADLINE') return 'bg-orange-50 text-orange-600';
    return EVENT_TYPE_BADGE[eventType] ?? 'bg-slate-100 text-slate-600';
  }

  function getEventLabel(eventType: CalendarEvent['eventType']): string {
    if (eventType === 'APPLICATION_DEADLINE') return '지원마감';
    return EVENT_TYPE_CONFIG[eventType]?.label ?? '기타';
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
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

        {/* View toggle */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('grid')}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-colors',
              view === 'grid'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            월
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-colors',
              view === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            일정 목록
          </button>
        </div>
      </div>

      {eventsLoading && <div className="text-sm text-slate-500 mb-3">불러오는 중...</div>}

      {/* Grid view */}
      {view === 'grid' && (
        <div>
          {/* Weekday header */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={label}
                className={cn(
                  'text-center text-xs font-medium py-2',
                  i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500',
                )}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 border-t border-l border-slate-200">
            {cells.map((cell) => {
              const dateStr = toDateStr(cell);
              const isCurrentMonth = cell.getMonth() + 1 === month;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dayEvents = eventsByDate[dateStr] ?? [];
              const dayOfWeek = cell.getDay();

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={cn(
                    'border-b border-r border-slate-200 min-h-[80px] p-1 cursor-pointer transition-colors',
                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-50',
                    !isCurrentMonth && 'bg-slate-50/50',
                  )}
                >
                  <div className="flex items-center justify-center mb-1">
                    <span
                      className={cn(
                        'text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium',
                        isToday
                          ? 'bg-blue-600 text-white'
                          : isCurrentMonth
                            ? dayOfWeek === 0
                              ? 'text-red-500'
                              : dayOfWeek === 6
                                ? 'text-blue-500'
                                : 'text-slate-800'
                            : 'text-slate-300',
                      )}
                    >
                      {cell.getDate()}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={cn(
                          'flex items-center gap-1 px-1 py-0.5 rounded text-xs truncate',
                          getBadgeClass(ev.eventType),
                        )}
                        title={ev.title}
                      >
                        <span
                          className={cn('w-1.5 h-1.5 rounded-full shrink-0', getDotClass(ev.eventType))}
                        />
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-slate-400 px-1">+{dayEvents.length - 2}개</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected date panel */}
          {selectedDate && (
            <div className="mt-4 border border-slate-200 rounded-lg bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                {selectedDate.replace(/-/g, '.')} 일정
              </h3>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-slate-400">이날 일정이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2 group"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full text-xs font-medium px-2 py-0.5',
                            getBadgeClass(ev.eventType),
                          )}
                        >
                          {getEventLabel(ev.eventType)}
                        </span>
                        <span className="text-sm text-slate-800">{ev.title}</span>
                      </div>
                      {!ev.id.startsWith('app-') && (
                        <button
                          onClick={() => deleteEvent.mutate(ev.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div>
          {allEvents.length === 0 && !eventsLoading && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">이번 달 일정이 없습니다.</p>
            </div>
          )}

          <div className="space-y-2">
            {allEvents
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-3 shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('rounded-full text-xs font-medium px-2.5 py-0.5', getBadgeClass(ev.eventType))}>
                      {getEventLabel(ev.eventType)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{ev.title}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(ev.date).toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                  {!ev.id.startsWith('app-') && (
                    <button
                      onClick={() => deleteEvent.mutate(ev.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
