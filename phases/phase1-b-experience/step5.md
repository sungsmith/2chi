# Step 5: experience-form-pages

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/web/hooks/use-experiences.ts`
- `apps/web/components/experience/experience-card.tsx`
- `packages/shared/src/types/experience.ts`
- `packages/shared/src/schemas/experience.schema.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Experience 생성·편집 폼 컴포넌트들과 관련 페이지들을 구현한다.

**생성할 파일:**
- `apps/web/components/experience/star-editor.tsx`
- `apps/web/components/experience/ai-star-convert-button.tsx`
- `apps/web/components/experience/experience-form.tsx`
- `apps/web/app/experience/new/page.tsx`
- `apps/web/app/experience/[id]/page.tsx`

### Step 1: STAR 에디터 컴포넌트 구현

`apps/web/components/experience/star-editor.tsx`:
```typescript
'use client';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface StarField {
  label: string;
  key: 'situation' | 'task' | 'action' | 'result';
  placeholder: string;
}

const STAR_FIELDS: StarField[] = [
  { key: 'situation', label: 'S — 상황', placeholder: '어떤 상황에서 일어난 일인지 설명하세요.' },
  { key: 'task', label: 'T — 과제', placeholder: '맡은 역할과 해결해야 했던 과제는 무엇인가요?' },
  { key: 'action', label: 'A — 행동', placeholder: '어떤 구체적인 행동을 취했나요? 본인이 한 일 중심으로.' },
  { key: 'result', label: 'R — 결과', placeholder: '어떤 결과를 얻었나요? 수치가 있다면 포함하세요.' },
];

interface Props {
  values: { situation?: string; task?: string; action?: string; result?: string };
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
}

export function StarEditor({ values, onChange, disabled }: Props) {
  return (
    <div className="space-y-4">
      {STAR_FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key} className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {label}
          </Label>
          <Textarea
            id={key}
            placeholder={placeholder}
            value={values[key] ?? ''}
            onChange={(e) => onChange(key, e.target.value)}
            disabled={disabled}
            rows={4}
            className="resize-none leading-relaxed"
          />
        </div>
      ))}
    </div>
  );
}
```

### Step 2: AI STAR 변환 버튼 구현

`apps/web/components/experience/ai-star-convert-button.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useConvertToStar } from '@/hooks/use-experiences';

interface Props {
  experienceId: string;
  onConverted: (star: { situation: string; task: string; action: string; result: string }) => void;
}

export function AiStarConvertButton({ experienceId, onConverted }: Props) {
  const [freeText, setFreeText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const convert = useConvertToStar(experienceId);

  const handleConvert = async () => {
    if (!freeText.trim()) return;
    const res = await convert.mutateAsync(freeText);
    if (res.success) {
      onConverted({
        situation: res.data.situation ?? '',
        task: res.data.task ?? '',
        action: res.data.action ?? '',
        result: res.data.result ?? '',
      });
      setIsOpen(false);
      setFreeText('');
    }
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-slate-600"
      >
        <Sparkles className="w-3.5 h-3.5" />
        AI로 STAR 변환
      </Button>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
      <p className="text-xs font-medium text-slate-600">자유롭게 이 경험을 서술하세요. AI가 STAR 구조로 변환해줍니다.</p>
      <Textarea
        value={freeText}
        onChange={(e) => setFreeText(e.target.value)}
        placeholder="예: 카카오에서 인턴으로 일하면서 데이터 파이프라인 성능 문제를 발견했고..."
        rows={5}
        className="resize-none"
      />
      {convert.data && !convert.data.success && (
        <p className="text-xs text-red-500">{convert.data.error.message}</p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleConvert}
          disabled={convert.isPending || !freeText.trim()}
        >
          {convert.isPending ? 'AI 변환 중...' : '변환하기'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          취소
        </Button>
      </div>
    </div>
  );
}
```

### Step 3: Experience 폼 컴포넌트 구현

`apps/web/components/experience/experience-form.tsx`:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StarEditor } from './star-editor';
import { AiStarConvertButton } from './ai-star-convert-button';
import { createExperienceSchema, type CreateExperienceInput, type ExperienceDto } from '@2chi/shared';

interface Props {
  defaultValues?: Partial<ExperienceDto>;
  experienceId?: string;
  onSubmit: (data: CreateExperienceInput) => void;
  isLoading?: boolean;
}

export function ExperienceForm({ defaultValues, experienceId, onSubmit, isLoading }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateExperienceInput>({
    resolver: zodResolver(createExperienceSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      type: defaultValues?.type ?? 'WORK',
      companyName: defaultValues?.companyName ?? '',
      isCurrent: defaultValues?.isCurrent ?? false,
      situation: defaultValues?.situation ?? '',
      task: defaultValues?.task ?? '',
      action: defaultValues?.action ?? '',
      result: defaultValues?.result ?? '',
      resultMetric: defaultValues?.resultMetric ?? '',
    },
  });

  const starValues = {
    situation: watch('situation'),
    task: watch('task'),
    action: watch('action'),
    result: watch('result'),
  };

  const handleStarChange = (key: string, value: string) => {
    setValue(key as any, value);
  };

  const handleConverted = (star: { situation: string; task: string; action: string; result: string }) => {
    Object.entries(star).forEach(([key, value]) => setValue(key as any, value));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">기본 정보</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="title">이력 제목</Label>
            <Input id="title" placeholder="예: 카카오 인턴십" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type">유형</Label>
            <select
              id="type"
              {...register('type')}
              className="w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="WORK">직장</option>
              <option value="PROJECT">프로젝트</option>
              <option value="ACTIVITY">활동</option>
              <option value="EDUCATION">교육</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyName">기관명 (선택)</Label>
            <Input id="companyName" placeholder="회사·학교·단체명" {...register('companyName')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resultMetric">수치 결과 (선택)</Label>
            <Input id="resultMetric" placeholder="예: 전환율 23% 향상" {...register('resultMetric')} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">STAR 구조</h2>
          {experienceId && (
            <AiStarConvertButton experienceId={experienceId} onConverted={handleConverted} />
          )}
        </div>
        <StarEditor values={starValues} onChange={handleStarChange} disabled={isLoading} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '저장 중...' : '저장'}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          취소
        </Button>
      </div>
    </form>
  );
}
```

### Step 4: 새 이력 페이지 구현

`apps/web/app/experience/new/page.tsx`:
```typescript
'use client';

import { useRouter } from 'next/navigation';
import { ExperienceForm } from '@/components/experience/experience-form';
import { useCreateExperience } from '@/hooks/use-experiences';
import type { CreateExperienceInput } from '@2chi/shared';

export default function NewExperiencePage() {
  const router = useRouter();
  const create = useCreateExperience();

  const handleSubmit = async (data: CreateExperienceInput) => {
    const res = await create.mutateAsync(data);
    if (res.success) router.push(`/experience/${res.data.id}`);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">이력 추가</h1>
      <ExperienceForm onSubmit={handleSubmit} isLoading={create.isPending} />
    </div>
  );
}
```

### Step 5: 이력 상세·편집 페이지 구현

`apps/web/app/experience/[id]/page.tsx`:
```typescript
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExperienceForm } from '@/components/experience/experience-form';
import { useExperience, useUpdateExperience, useDeleteExperience } from '@/hooks/use-experiences';
import type { UpdateExperienceInput } from '@2chi/shared';

export default function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: experience, isLoading } = useExperience(id);
  const update = useUpdateExperience(id);
  const delete_ = useDeleteExperience();

  const handleSubmit = async (data: UpdateExperienceInput) => {
    await update.mutateAsync(data);
  };

  const handleDelete = async () => {
    if (!confirm('이 이력을 삭제할까요?')) return;
    await delete_.mutateAsync(id);
    router.push('/experience');
  };

  if (isLoading) return <div className="text-sm text-slate-500">불러오는 중...</div>;
  if (!experience) return <div className="text-sm text-red-500">이력을 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{experience.title}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={delete_.isPending}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          삭제
        </Button>
      </div>
      <ExperienceForm
        defaultValues={experience}
        experienceId={id}
        onSubmit={handleSubmit}
        isLoading={update.isPending}
      />
    </div>
  );
}
```

### Step 6: 커밋

```bash
git add apps/web/components/experience apps/web/app/experience
git commit -m "feat(web): add experience list, create, edit, and AI STAR conversion UI"
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
- packages/shared의 타입(ExperienceDto, CreateExperienceInput 등)을 재정의하지 마라
- 서버 컴포넌트가 아닌 경우에만 'use client'를 붙인다
