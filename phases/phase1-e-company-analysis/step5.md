# Step 5: company-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `docs/UI_GUIDE.md`
- `apps/web/components/shared/sidebar.tsx`
- `apps/web/components/experience/experience-card.tsx`
- `apps/web/hooks/use-companies.ts`
- `packages/shared/src/types/company.ts`
- `packages/shared/src/schemas/company.schema.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

기업 분석 UI를 구현한다. 기업 목록 페이지, 기업 분석 상세 페이지, 기업 분석 폼, 매칭도 뱃지를 생성하고 사이드바에 메뉴를 추가한다.

**생성할 파일:**
- `apps/web/components/company/company-card.tsx`
- `apps/web/components/company/analyze-form.tsx`
- `apps/web/components/company/competency-list.tsx`
- `apps/web/components/cover-letter/matching-score-badge.tsx`
- `apps/web/app/company/page.tsx`
- `apps/web/app/company/[id]/page.tsx`

**수정할 파일:**
- `apps/web/components/shared/sidebar.tsx`

### Step 1: CompanyCard 구현

`apps/web/components/company/company-card.tsx`:
```typescript
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import type { CompanyDto } from '@2chi/shared';

export function CompanyCard({ company }: { company: CompanyDto }) {
  const isAnalyzed = !!company.analyzedAt;

  return (
    <Link href={`/company/${company.id}`}>
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 rounded-md">
            <Building2 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-slate-900">{company.name}</h3>
            {company.industry && (
              <p className="text-xs text-slate-500 mt-0.5">{company.industry}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                isAnalyzed ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {isAnalyzed ? '분석 완료' : '미분석'}
              </span>
              {company.keyCompetencies.length > 0 && (
                <span className="text-xs text-slate-400">
                  역량 {company.keyCompetencies.length}개
                </span>
              )}
            </div>
          </div>
        </div>
        {company.keyCompetencies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {company.keyCompetencies.slice(0, 4).map((c, i) => (
              <span key={i} className="rounded-md bg-blue-50 text-blue-700 text-xs px-2 py-0.5">
                {c}
              </span>
            ))}
            {company.keyCompetencies.length > 4 && (
              <span className="text-xs text-slate-400 self-center">
                +{company.keyCompetencies.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
```

### Step 2: AnalyzeForm 구현

`apps/web/components/company/analyze-form.tsx`:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnalyzeCompany } from '@/hooks/use-companies';
import { analyzeCompanySchema, type AnalyzeCompanyInput, type CompanyDto } from '@2chi/shared';

interface Props {
  onAnalyzed: (company: CompanyDto) => void;
}

export function AnalyzeForm({ onAnalyzed }: Props) {
  const analyze = useAnalyzeCompany();
  const { register, handleSubmit, formState: { errors } } = useForm<AnalyzeCompanyInput>({
    resolver: zodResolver(analyzeCompanySchema),
  });

  const onSubmit = async (data: AnalyzeCompanyInput) => {
    const res = await analyze.mutateAsync(data);
    if (res.success) onAnalyzed(res.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">기업명</Label>
          <Input id="name" placeholder="카카오" {...register('name')} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jobTitle">지원 직무 (선택)</Label>
          <Input id="jobTitle" placeholder="프론트엔드 개발자" {...register('jobTitle')} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="additionalContext">추가 맥락 (선택)</Label>
        <Input
          id="additionalContext"
          placeholder="채용공고에서 특별히 강조한 내용, 사업부 정보 등"
          {...register('additionalContext')}
        />
      </div>
      {analyze.data && !analyze.data.success && (
        <p className="text-xs text-red-500">{analyze.data.error.message}</p>
      )}
      <Button type="submit" disabled={analyze.isPending}>
        {analyze.isPending ? 'AI 분석 중...' : '기업 분석 시작'}
      </Button>
    </form>
  );
}
```

### Step 3: CompetencyList 구현

`apps/web/components/company/competency-list.tsx`:
```typescript
interface Props {
  competencies: string[];
  title?: string;
}

export function CompetencyList({ competencies, title = '핵심 역량' }: Props) {
  if (!competencies.length) return null;

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {competencies.map((c, i) => (
          <span key={i} className="rounded-md bg-blue-50 text-blue-700 text-sm px-3 py-1">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
```

### Step 4: MatchingScoreBadge 구현

`apps/web/components/cover-letter/matching-score-badge.tsx`:
```typescript
'use client';

import { useMatchingScore } from '@/hooks/use-companies';
import { cn } from '@/lib/utils';

interface Props {
  coverLetterId: string;
  currentScore: number | null;
}

export function MatchingScoreBadge({ coverLetterId, currentScore }: Props) {
  const calculateScore = useMatchingScore(coverLetterId);

  const scoreColor =
    currentScore === null ? 'text-slate-400 bg-slate-100' :
    currentScore >= 70 ? 'text-green-700 bg-green-50' :
    currentScore >= 40 ? 'text-amber-700 bg-amber-50' : 'text-red-600 bg-red-50';

  return (
    <div className="flex items-center gap-2">
      {currentScore !== null && (
        <span className={cn('rounded-full text-xs font-medium px-2.5 py-0.5', scoreColor)}>
          매칭도 {currentScore}%
        </span>
      )}
      <button
        type="button"
        onClick={() => calculateScore.mutate()}
        disabled={calculateScore.isPending}
        className="text-xs text-blue-600 hover:underline disabled:text-slate-400"
      >
        {calculateScore.isPending ? '계산 중...' : currentScore === null ? '매칭도 계산' : '재계산'}
      </button>
    </div>
  );
}
```

### Step 5: 기업 목록 페이지 구현

`apps/web/app/company/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { CompanyCard } from '@/components/company/company-card';
import { AnalyzeForm } from '@/components/company/analyze-form';
import { useCompanies } from '@/hooks/use-companies';
import type { CompanyDto } from '@2chi/shared';

export default function CompanyListPage() {
  const { data: companies, isLoading } = useCompanies();
  const [latestAnalyzed, setLatestAnalyzed] = useState<CompanyDto | null>(null);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">기업·직무 분석</h1>
        <p className="text-sm text-slate-500 mt-0.5">기업을 분석하고 필요 역량을 파악하세요.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">새 기업 분석</h2>
        <AnalyzeForm onAnalyzed={setLatestAnalyzed} />
        {latestAnalyzed && (
          <div className="mt-4 p-3 bg-green-50 rounded-md text-sm text-green-700">
            <span className="font-medium">{latestAnalyzed.name}</span> 분석 완료.{' '}
            <a href={`/company/${latestAnalyzed.id}`} className="underline">
              결과 보기 →
            </a>
          </div>
        )}
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {companies?.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">분석한 기업이 없습니다.</p>
          <p className="text-xs mt-1">위에서 기업명을 입력해 분석을 시작하세요.</p>
        </div>
      )}

      <div className="grid gap-3">
        {companies?.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>
    </div>
  );
}
```

### Step 6: 기업 분석 상세 페이지 구현

`apps/web/app/company/[id]/page.tsx`:
```typescript
'use client';

import { useParams } from 'next/navigation';
import { Building2, RefreshCw } from 'lucide-react';
import { CompetencyList } from '@/components/company/competency-list';
import { AnalyzeForm } from '@/components/company/analyze-form';
import { useCompany } from '@/hooks/use-companies';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading, refetch } = useCompany(id);

  if (isLoading) return <div className="text-sm text-slate-500">불러오는 중...</div>;
  if (!company) return <div className="text-sm text-red-500">기업 정보를 찾을 수 없습니다.</div>;

  const officialInfo = company.officialInfo as {
    summary?: string;
    products?: string[];
    recentNews?: string[];
  } | null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-5 h-5 text-slate-500" />
          <h1 className="text-2xl font-semibold text-slate-900">{company.name}</h1>
        </div>
        {company.analyzedAt && (
          <p className="text-xs text-slate-400">
            분석일: {new Date(company.analyzedAt).toLocaleDateString('ko-KR')}
          </p>
        )}
      </div>

      {officialInfo && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          {officialInfo.summary && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">기업 요약</p>
              <p className="text-sm text-slate-700 leading-relaxed">{officialInfo.summary}</p>
            </div>
          )}
          {officialInfo.products && officialInfo.products.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">주요 제품/서비스</p>
              <ul className="space-y-1">
                {officialInfo.products.map((p, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-400">•</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {officialInfo.recentNews && officialInfo.recentNews.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">최근 동향</p>
              <ul className="space-y-1">
                {officialInfo.recentNews.map((n, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-400">•</span>{n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {company.keyCompetencies.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <CompetencyList competencies={company.keyCompetencies} />
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          재분석
        </h2>
        <AnalyzeForm onAnalyzed={() => refetch()} />
      </div>
    </div>
  );
}
```

### Step 7: 사이드바에 기업 분석 메뉴 추가

`apps/web/components/shared/sidebar.tsx`의 `NAV_ITEMS` 배열에 Building2 아이콘과 함께 기업 분석 메뉴를 추가한다.

파일 상단 import에 `Building2`를 추가:
```typescript
import { Building2 } from 'lucide-react';
```

NAV_ITEMS 배열에 (cover-letter 다음 위치에) 추가:
```typescript
{ href: '/company', label: '기업 분석', icon: Building2 },
```

### Step 8: 린트 실행

```bash
cd apps/web && pnpm lint
```

Expected: 에러 없음.

### Step 9: 커밋

```bash
git add apps/web/app/company apps/web/components/company apps/web/components/cover-letter/matching-score-badge.tsx apps/web/components/shared/sidebar.tsx
git commit -m "feat(web): add company analysis and matching score UI"
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
   - packages/shared 타입을 사용하고 있는가?
   - 컴포넌트는 서버 컴포넌트 기본, 인터랙션 필요 시에만 'use client'인가?
3. 결과에 따라 `phases/phase1-e-company-analysis/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- UI_GUIDE.md의 AI 슬롭 안티패턴(과도한 그라디언트, 글로우 이펙트, 마케팅 페이지 느낌)을 사용하지 마라
- apps/web 내에서 Company 관련 타입을 독자적으로 재정의하지 마라 — 반드시 `@2chi/shared`의 타입을 사용한다
- `company.officialInfo`는 Prisma에서 `Json?`이므로 프론트에서 타입 캐스팅 필요 — 상세 페이지에 반드시 반영할 것
