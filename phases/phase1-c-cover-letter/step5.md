# Step 5: cover-letter-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/web/hooks/use-cover-letters.ts`
- `apps/web/hooks/use-job-postings.ts`
- `packages/shared/src/types/cover-letter.ts`
- `packages/shared/src/schemas/cover-letter.schema.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

CoverLetter UI 컴포넌트들과 페이지들을 구현한다. ItemEditor에서 SSE 스트리밍으로 AI 초안을 받는다.

**생성할 파일:**
- `apps/web/components/cover-letter/cover-letter-card.tsx`
- `apps/web/components/cover-letter/job-posting-input.tsx`
- `apps/web/components/cover-letter/feedback-panel.tsx`
- `apps/web/components/cover-letter/item-editor.tsx`
- `apps/web/app/cover-letter/page.tsx`
- `apps/web/app/cover-letter/new/page.tsx`
- `apps/web/app/cover-letter/[id]/page.tsx`

### Step 1: CoverLetterCard 구현

`apps/web/components/cover-letter/cover-letter-card.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { CoverLetterDto } from '@2chi/shared';

const STATUS_CONFIG = {
  DRAFT: { label: '초안', className: 'bg-slate-100 text-slate-600' },
  EDITING: { label: '작성 중', className: 'bg-blue-50 text-blue-700' },
  DONE: { label: '완료', className: 'bg-green-50 text-green-700' },
} as const;

export function CoverLetterCard({ coverLetter }: { coverLetter: CoverLetterDto }) {
  const status = STATUS_CONFIG[coverLetter.status];

  return (
    <Link href={`/cover-letter/${coverLetter.id}`}>
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn('rounded-full text-xs font-medium px-2.5 py-0.5', status.className)}>
                {status.label}
              </span>
              {coverLetter.jobPosting && (
                <span className="text-xs text-slate-500">{coverLetter.jobPosting.title}</span>
              )}
            </div>
            <h3 className="text-sm font-medium text-slate-900 truncate">{coverLetter.title}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-slate-400">항목</p>
            <p className="text-sm font-medium text-slate-700">{coverLetter.items.length}개</p>
          </div>
        </div>
        {coverLetter.matchingScore !== null && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${coverLetter.matchingScore}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">매칭도 {coverLetter.matchingScore}%</span>
          </div>
        )}
      </div>
    </Link>
  );
}
```

### Step 2: JobPostingInput 구현

`apps/web/components/cover-letter/job-posting-input.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useParseJobPosting } from '@/hooks/use-job-postings';
import type { JobPostingDto } from '@2chi/shared';

interface Props {
  onParsed: (jobPosting: JobPostingDto) => void;
}

export function JobPostingInput({ onParsed }: Props) {
  const [text, setText] = useState('');
  const parse = useParseJobPosting();

  const handleParse = async () => {
    if (!text.trim()) return;
    const res = await parse.mutateAsync({ text });
    if (res.success) onParsed(res.data);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          채용공고 붙여넣기 (선택)
        </label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="채용공고 전체 내용을 붙여넣으세요. AI가 직무, 필수역량, 마감일 등을 자동으로 파악합니다."
          rows={6}
          className="resize-none"
        />
      </div>
      {parse.data && !parse.data.success && (
        <p className="text-xs text-red-500">{parse.data.error.message}</p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleParse}
        disabled={parse.isPending || !text.trim()}
      >
        {parse.isPending ? '분석 중...' : '공고 분석'}
      </Button>
    </div>
  );
}
```

### Step 3: FeedbackPanel 구현

`apps/web/components/cover-letter/feedback-panel.tsx`:
```typescript
'use client';

import type { CoverLetterItemFeedback } from '@2chi/shared';

interface Props {
  feedback: CoverLetterItemFeedback;
}

export function FeedbackPanel({ feedback }: Props) {
  const scoreColor =
    feedback.score >= 80 ? 'text-green-600' :
    feedback.score >= 60 ? 'text-amber-600' : 'text-red-500';

  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">AI 피드백</span>
        <span className={`text-lg font-semibold ${scoreColor}`}>{feedback.score}점</span>
      </div>

      {feedback.suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">개선 제안</p>
          <ul className="space-y-1">
            {feedback.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-blue-500 shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.awkwardPhrases.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">어색한 표현</p>
          <div className="flex flex-wrap gap-1.5">
            {feedback.awkwardPhrases.map((p, i) => (
              <span key={i} className="rounded-md bg-red-50 text-red-600 text-xs px-2 py-0.5">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {feedback.missingKeywords.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">빠진 키워드</p>
          <div className="flex flex-wrap gap-1.5">
            {feedback.missingKeywords.map((k, i) => (
              <span key={i} className="rounded-md bg-amber-50 text-amber-700 text-xs px-2 py-0.5">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 4: ItemEditor 구현 (SSE 스트리밍 포함)

`apps/web/components/cover-letter/item-editor.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FeedbackPanel } from './feedback-panel';
import { useUpdateCoverLetterItem, useGenerateFeedback } from '@/hooks/use-cover-letters';
import type { CoverLetterItemDto } from '@2chi/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  coverLetterId: string;
  item: CoverLetterItemDto;
}

export function ItemEditor({ coverLetterId, item }: Props) {
  const [content, setContent] = useState(item.userContent ?? item.aiDraft ?? '');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const updateItem = useUpdateCoverLetterItem(coverLetterId, item.id);
  const generateFeedback = useGenerateFeedback(coverLetterId, item.id);

  const handleSave = () => {
    updateItem.mutate({ userContent: content });
  };

  const handleGenerateDraft = async () => {
    setIsStreaming(true);
    setContent('');

    const token = (() => {
      try {
        const stored = localStorage.getItem('2chi-auth');
        return stored ? JSON.parse(stored)?.state?.accessToken : null;
      } catch { return null; }
    })();

    const res = await fetch(
      `${API_BASE}/cover-letters/${coverLetterId}/items/${item.id}/draft`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) { setIsStreaming(false); return; }

    let accumulated = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') { setIsStreaming(false); break; }
        try {
          const parsed = JSON.parse(raw);
          if (parsed.text) {
            accumulated += parsed.text;
            setContent(accumulated);
          }
        } catch { /* 파싱 실패 무시 */ }
      }
    }

    setIsStreaming(false);
  };

  const charCount = content.length;
  const isOverLimit = item.charLimit ? charCount > item.charLimit : false;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">{item.question}</p>
        {item.charLimit && (
          <span className={`text-xs shrink-0 ${isOverLimit ? 'text-red-500' : 'text-slate-400'}`}>
            {charCount}/{item.charLimit}자
          </span>
        )}
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 작성하거나 AI 초안을 생성하세요."
        rows={8}
        className="resize-none leading-relaxed text-base text-slate-800"
        disabled={isStreaming}
      />

      {isStreaming && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="animate-pulse">|</span>
          AI가 초안을 작성하고 있습니다...
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerateDraft}
          disabled={isStreaming}
          className="flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI 초안 생성
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={updateItem.isPending || isOverLimit}
        >
          {updateItem.isPending ? '저장 중...' : '저장'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            generateFeedback.mutate();
            setShowFeedback(true);
          }}
          disabled={generateFeedback.isPending || !content.trim()}
          className="flex items-center gap-1.5 ml-auto"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {generateFeedback.isPending ? '피드백 생성 중...' : 'AI 피드백'}
        </Button>
      </div>

      {item.feedback && showFeedback && (
        <FeedbackPanel feedback={item.feedback as any} />
      )}
    </div>
  );
}
```

### Step 5: 자소서 목록 페이지 구현

`apps/web/app/cover-letter/page.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CoverLetterCard } from '@/components/cover-letter/cover-letter-card';
import { useCoverLetters } from '@/hooks/use-cover-letters';

export default function CoverLetterListPage() {
  const { data: coverLetters, isLoading } = useCoverLetters();

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">자소서</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI가 내 이력을 바탕으로 초안을 작성합니다.</p>
        </div>
        <Link href="/cover-letter/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            자소서 만들기
          </Button>
        </Link>
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {coverLetters?.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">아직 자소서가 없습니다.</p>
          <p className="text-xs mt-1">채용공고를 붙여넣고 자소서를 시작해보세요.</p>
        </div>
      )}

      <div className="grid gap-3">
        {coverLetters?.map((cl) => (
          <CoverLetterCard key={cl.id} coverLetter={cl} />
        ))}
      </div>
    </div>
  );
}
```

### Step 6: 자소서 생성 페이지 구현

`apps/web/app/cover-letter/new/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JobPostingInput } from '@/components/cover-letter/job-posting-input';
import { useCreateCoverLetter } from '@/hooks/use-cover-letters';
import { createCoverLetterSchema, type CreateCoverLetterInput, type JobPostingDto } from '@2chi/shared';

export default function NewCoverLetterPage() {
  const router = useRouter();
  const [parsedJobPosting, setParsedJobPosting] = useState<JobPostingDto | null>(null);
  const create = useCreateCoverLetter();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateCoverLetterInput>({
    resolver: zodResolver(createCoverLetterSchema),
    defaultValues: { title: '' },
  });

  const handleJobPostingParsed = (jp: JobPostingDto) => {
    setParsedJobPosting(jp);
    setValue('jobPostingId', jp.id);
    if (!jp.title) return;
    setValue('title', jp.title);
  };

  const onSubmit = async (data: CreateCoverLetterInput) => {
    const res = await create.mutateAsync(data);
    if (res.success) router.push(`/cover-letter/${res.data.id}`);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">자소서 만들기</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <JobPostingInput onParsed={handleJobPostingParsed} />
          {parsedJobPosting && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md text-xs text-blue-700 space-y-1">
              <p className="font-medium">공고 분석 완료</p>
              <p>직무: {parsedJobPosting.title}</p>
              {parsedJobPosting.requiredCompetencies.length > 0 && (
                <p>필수역량: {parsedJobPosting.requiredCompetencies.join(', ')}</p>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">자소서 제목</Label>
            <Input id="title" placeholder="예: 카카오 2024 하반기" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? '생성 중...' : '자소서 생성'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

### Step 7: 자소서 편집 페이지 구현

`apps/web/app/cover-letter/[id]/page.tsx`:
```typescript
'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemEditor } from '@/components/cover-letter/item-editor';
import { useCoverLetter, useAddCoverLetterItem } from '@/hooks/use-cover-letters';

export default function CoverLetterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: coverLetter, isLoading } = useCoverLetter(id);
  const addItem = useAddCoverLetterItem(id);
  const [newQuestion, setNewQuestion] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddItem = async () => {
    if (!newQuestion.trim()) return;
    await addItem.mutateAsync({
      question: newQuestion,
      order: coverLetter?.items.length ?? 0,
    });
    setNewQuestion('');
    setShowAddForm(false);
  };

  if (isLoading) return <div className="text-sm text-slate-500">불러오는 중...</div>;
  if (!coverLetter) return <div className="text-sm text-red-500">자소서를 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{coverLetter.title}</h1>
        {coverLetter.jobPosting && (
          <p className="text-sm text-slate-500 mt-0.5">{coverLetter.jobPosting.title}</p>
        )}
      </div>

      <div className="space-y-4">
        {coverLetter.items.map((item) => (
          <ItemEditor key={item.id} coverLetterId={id} item={item} />
        ))}

        {showAddForm ? (
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
            <Input
              placeholder="항목 질문을 입력하세요. 예: 지원 동기를 서술하세요."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddItem} disabled={addItem.isPending}>
                {addItem.isPending ? '추가 중...' : '항목 추가'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full flex items-center gap-2 text-slate-500"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4" />
            항목 추가
          </Button>
        )}
      </div>
    </div>
  );
}
```

### Step 8: 커밋

```bash
git add apps/web/app/cover-letter apps/web/components/cover-letter
git commit -m "feat(web): add cover letter UI with SSE streaming and AI feedback"
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
3. 결과에 따라 `phases/phase1-c-cover-letter/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- packages/shared의 타입(CoverLetterDto, CoverLetterItemDto 등)을 재정의하지 마라
- SSE 스트리밍은 `fetch` + ReadableStream으로 구현한다. Vercel AI SDK `useCompletion`은 옵션이지만, 기본 구현은 `fetch` 기반으로 작성한다
