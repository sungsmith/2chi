# Step 5: calendar-ui-main-page

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/web/hooks/use-applications.ts`
- `apps/web/hooks/use-calendar.ts`
- `apps/web/components/applications/application-board.tsx`
- `apps/web/components/applications/add-application-modal.tsx`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

CalendarView 컴포넌트와 Applications 메인 페이지를 구현한다. 메인 페이지는 보드 탭과 캘린더 탭으로 구분된다.

**생성할 파일:**
- `apps/web/components/applications/calendar-view.tsx`
- `apps/web/app/applications/page.tsx`

### Step 1: CalendarView 구현

`apps/web/components/applications/calendar-view.tsx`:
```typescript
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
```

### Step 2: Applications 메인 페이지 구현 (탭: 보드 | 캘린더)

`apps/web/app/applications/page.tsx`:
```typescript
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
```

### Step 3: 커밋

```bash
git add apps/web/components/applications/calendar-view.tsx apps/web/app/applications
git commit -m "feat(web): add applications board and calendar view with add modal"
```

## Acceptance Criteria

```bash
cd apps/web && pnpm lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/phase1-d-applications-calendar/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- packages/shared의 타입을 재정의하지 마라
