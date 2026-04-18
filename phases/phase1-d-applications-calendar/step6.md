# Step 6: dashboard-stats

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/web/app/(dashboard)/page.tsx`
- `apps/web/hooks/use-experiences.ts`
- `apps/web/hooks/use-cover-letters.ts`
- `apps/web/hooks/use-applications.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

대시보드 페이지를 실제 데이터(이력 수, 자소서 수, 진행 중인 지원 수)로 업데이트한다.

**수정할 파일:**
- `apps/web/app/(dashboard)/page.tsx`

### Step 1: 대시보드 페이지를 실제 데이터로 업데이트

`apps/web/app/(dashboard)/page.tsx`를 다음으로 교체:
```typescript
'use client';

import { useExperiences } from '@/hooks/use-experiences';
import { useCoverLetters } from '@/hooks/use-cover-letters';
import { useApplications } from '@/hooks/use-applications';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: experiences } = useExperiences();
  const { data: coverLetters } = useCoverLetters();
  const { data: applications } = useApplications();

  const activeApplications = applications?.filter(
    (a) => a.currentStage !== 'DONE' && a.result !== 'FAIL' && a.result !== 'WITHDRAWN',
  ).length ?? 0;

  const stats = [
    { label: '내 이력', value: experiences?.length ?? '—', href: '/experience' },
    { label: '자소서', value: coverLetters?.length ?? '—', href: '/cover-letter' },
    { label: '진행 중인 지원', value: applications !== undefined ? activeApplications : '—', href: '/applications' },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">대시보드</h1>
      <p className="text-sm text-slate-500 mb-8">취업 준비 현황을 한눈에 확인하세요.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, href }) => (
          <Link key={label} href={href}>
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-semibold text-slate-900 mt-2">{value}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### Step 2: 커밋

```bash
git add "apps/web/app/(dashboard)/page.tsx"
git commit -m "feat(web): connect dashboard stats to real data"
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

- 이 step에서 다루지 않는 파일 수정 금지 — `(dashboard)/page.tsx`만 수정한다
- 기존 테스트를 깨뜨리지 마라
