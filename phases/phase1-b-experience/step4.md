# Step 4: experience-list-page

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/web/hooks/use-experiences.ts`
- `packages/shared/src/types/experience.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Experience 목록 페이지와 ExperienceCard 컴포넌트를 구현한다.

**생성할 파일:**
- `apps/web/components/experience/experience-card.tsx`
- `apps/web/app/experience/page.tsx`

### Step 1: ExperienceCard 컴포넌트 구현

`apps/web/components/experience/experience-card.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { Briefcase, GraduationCap, Code2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExperienceDto } from '@2chi/shared';

const TYPE_CONFIG = {
  WORK: { label: '직장', icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
  PROJECT: { label: '프로젝트', icon: Code2, color: 'text-green-600 bg-green-50' },
  ACTIVITY: { label: '활동', icon: Users, color: 'text-amber-600 bg-amber-50' },
  EDUCATION: { label: '교육', icon: GraduationCap, color: 'text-slate-600 bg-slate-100' },
} as const;

interface Props {
  experience: ExperienceDto;
}

export function ExperienceCard({ experience }: Props) {
  const config = TYPE_CONFIG[experience.type];
  const Icon = config.icon;

  const starComplete = [experience.situation, experience.task, experience.action, experience.result].filter(Boolean).length;

  return (
    <Link href={`/experience/${experience.id}`}>
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn('inline-flex items-center gap-1 rounded-md text-xs px-2 py-1 font-medium', config.color)}>
                <Icon className="w-3 h-3" />
                {config.label}
              </span>
              {experience.companyName && (
                <span className="text-xs text-slate-500">{experience.companyName}</span>
              )}
            </div>
            <h3 className="text-sm font-medium text-slate-900 truncate">{experience.title}</h3>
            {experience.resultMetric && (
              <p className="text-xs text-slate-500 mt-1">{experience.resultMetric}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-slate-400">STAR</p>
            <p className="text-sm font-medium text-slate-700">{starComplete}/4</p>
          </div>
        </div>
        {experience.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {experience.tags.slice(0, 5).map(({ tag }) => (
              <span key={tag.id} className="rounded-md bg-slate-100 text-slate-600 text-xs px-2 py-0.5">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
```

### Step 2: Experience 목록 페이지 구현

`apps/web/app/experience/page.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExperienceCard } from '@/components/experience/experience-card';
import { useExperiences } from '@/hooks/use-experiences';

export default function ExperiencePage() {
  const { data: experiences, isLoading } = useExperiences();

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">내 이력</h1>
          <p className="text-sm text-slate-500 mt-0.5">STAR 구조로 이력을 관리하세요.</p>
        </div>
        <Link href="/experience/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            이력 추가
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="text-sm text-slate-500">불러오는 중...</div>
      )}

      {experiences?.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">아직 이력이 없습니다.</p>
          <p className="text-xs mt-1">첫 이력을 추가해보세요.</p>
        </div>
      )}

      <div className="grid gap-3">
        {experiences?.map((exp) => (
          <ExperienceCard key={exp.id} experience={exp} />
        ))}
      </div>
    </div>
  );
}
```

### Step 3: 커밋

```bash
git add apps/web/app/experience/page.tsx apps/web/components/experience/experience-card.tsx
git commit -m "feat(web): add experience list page"
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
3. 결과에 따라 `phases/phase1-b-experience/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- packages/shared의 타입(ExperienceDto 등)을 재정의하지 마라
- 서버 컴포넌트가 아닌 경우에만 'use client'를 붙인다
