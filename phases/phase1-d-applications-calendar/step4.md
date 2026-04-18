# Step 4: applications-board-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/web/hooks/use-applications.ts`
- `apps/web/hooks/use-job-postings.ts`
- `packages/shared/src/types/application.ts`
- `packages/shared/src/schemas/application.schema.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

지원 현황 보드 UI 컴포넌트들을 구현한다.

**생성할 파일:**
- `apps/web/components/applications/application-card.tsx`
- `apps/web/components/applications/add-application-modal.tsx`
- `apps/web/components/applications/application-board.tsx`

### Step 1: ApplicationCard 구현

`apps/web/components/applications/application-card.tsx`:
```typescript
'use client';

import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeleteApplication } from '@/hooks/use-applications';
import type { ApplicationDto } from '@2chi/shared';

const RESULT_CONFIG = {
  PASS: { label: '합격', className: 'text-green-600 bg-green-50' },
  FAIL: { label: '불합격', className: 'text-red-500 bg-red-50' },
  PENDING: { label: '대기', className: 'text-amber-600 bg-amber-50' },
  WITHDRAWN: { label: '포기', className: 'text-slate-500 bg-slate-100' },
} as const;

export function ApplicationCard({ application }: { application: ApplicationDto }) {
  const delete_ = useDeleteApplication();
  const result = application.result ? RESULT_CONFIG[application.result] : null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {application.company?.name ?? application.jobPosting?.title ?? '(미입력)'}
          </p>
          {application.jobPosting && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{application.jobPosting.title}</p>
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
        <button
          onClick={() => {
            if (confirm('이 지원 현황을 삭제할까요?')) delete_.mutate(application.id);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {result && (
        <span className={cn('inline-block mt-2 rounded-full text-xs font-medium px-2.5 py-0.5', result.className)}>
          {result.label}
        </span>
      )}
    </div>
  );
}
```

### Step 2: AddApplicationModal 구현

`apps/web/components/applications/add-application-modal.tsx`:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateApplication } from '@/hooks/use-applications';
import { useJobPostings } from '@/hooks/use-job-postings';
import { createApplicationSchema, type CreateApplicationInput } from '@2chi/shared';

interface Props {
  onClose: () => void;
}

export function AddApplicationModal({ onClose }: Props) {
  const create = useCreateApplication();
  const { data: jobPostings } = useJobPostings();

  const { register, handleSubmit } = useForm<CreateApplicationInput>({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: { currentStage: 'DOCUMENT' },
  });

  const onSubmit = async (data: CreateApplicationInput) => {
    const res = await create.mutateAsync(data);
    if (res.success) onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">지원 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {jobPostings && jobPostings.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="jobPostingId">연결된 채용공고 (선택)</Label>
              <select
                id="jobPostingId"
                {...register('jobPostingId')}
                className="w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택 안함</option>
                {jobPostings.map((jp) => (
                  <option key={jp.id} value={jp.id}>{jp.title}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="appliedAt">지원일 (선택)</Label>
            <Input id="appliedAt" type="date" {...register('appliedAt')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currentStage">현재 단계</Label>
            <select
              id="currentStage"
              {...register('currentStage')}
              className="w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DOCUMENT">서류</option>
              <option value="FIRST_INTERVIEW">1차 면접</option>
              <option value="SECOND_INTERVIEW">2차 면접</option>
              <option value="FINAL_INTERVIEW">최종 면접</option>
              <option value="OFFER">오퍼</option>
              <option value="DONE">완료</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={create.isPending} className="flex-1">
              {create.isPending ? '추가 중...' : '추가'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Step 3: ApplicationBoard 구현

`apps/web/components/applications/application-board.tsx`:
```typescript
'use client';

import { ApplicationCard } from './application-card';
import type { ApplicationDto, ApplicationStage } from '@2chi/shared';

const STAGE_COLUMNS: { key: ApplicationStage; label: string }[] = [
  { key: 'DOCUMENT', label: '서류' },
  { key: 'FIRST_INTERVIEW', label: '1차 면접' },
  { key: 'SECOND_INTERVIEW', label: '2차 면접' },
  { key: 'FINAL_INTERVIEW', label: '최종 면접' },
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
```

### Step 4: 커밋

```bash
git add apps/web/components/applications
git commit -m "feat(web): add application board, card, and add-application modal"
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
- packages/shared의 타입(ApplicationDto, ApplicationStage 등)을 재정의하지 마라
