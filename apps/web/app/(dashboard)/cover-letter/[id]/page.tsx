'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, Loader2, X, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCoverLetter, useAddCoverLetterItem } from '@/hooks/use-cover-letters';
import { useExperiences } from '@/hooks/use-experiences';
import { createCoverLetterItemSchema, type CreateCoverLetterItemInput, type CoverLetterItemDto } from '@2chi/shared';
import type { ExperienceDto } from '@2chi/shared';
import { api } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('2chi-auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

interface RecommendResult {
  experienceId: string;
  score: number;
  reason: string;
}

async function fetchRecommendations(coverLetterId: string, itemId: string): Promise<RecommendResult[]> {
  const res = await api.post<RecommendResult[]>(
    `/cover-letters/${coverLetterId}/items/${itemId}/recommend`,
    {},
  );
  if (!res.success) throw new Error(res.error.message);
  return res.data;
}

// ─── Add Item Modal ─────────────────────────────────────────────────

interface AddItemModalProps {
  coverLetterId: string;
  itemCount: number;
  onClose: () => void;
}

function AddItemModal({ coverLetterId, itemCount, onClose }: AddItemModalProps) {
  const addItem = useAddCoverLetterItem(coverLetterId);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Omit<CreateCoverLetterItemInput, 'order'>>({
    resolver: zodResolver(createCoverLetterItemSchema.omit({ order: true })),
  });

  const onSubmit = async (data: Omit<CreateCoverLetterItemInput, 'order'>) => {
    await addItem.mutateAsync({ ...data, order: itemCount });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">항목 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="question">
              질문 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="question"
              rows={3}
              placeholder="자기소개서 문항을 입력하세요"
              {...register('question')}
            />
            {errors.question && (
              <p className="text-xs text-red-500">{errors.question.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="charLimit">글자수 제한 (선택)</Label>
            <Controller
              name="charLimit"
              control={control}
              render={({ field }) => (
                <Input
                  id="charLimit"
                  type="number"
                  placeholder="1000"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              )}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={addItem.isPending} className="flex-1">
              {addItem.isPending ? '추가 중...' : '추가'}
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

// ─── Experience Card for recommendation ─────────────────────────────

const EXPERIENCE_TYPE_LABEL: Record<string, string> = {
  WORK: '업무',
  PROJECT: '프로젝트',
  ACTIVITY: '활동',
  EDUCATION: '교육',
};

interface ExperienceSelectCardProps {
  experience: ExperienceDto;
  recommendation?: RecommendResult;
  selected: boolean;
  onToggle: () => void;
}

function ExperienceSelectCard({ experience, recommendation, selected, onToggle }: ExperienceSelectCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full text-left rounded-lg border p-4 transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-blue-500">
          {selected ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4 text-slate-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-900 truncate">{experience.title}</span>
            <Badge variant="outline" className="text-xs shrink-0">
              {EXPERIENCE_TYPE_LABEL[experience.type] ?? experience.type}
            </Badge>
            {recommendation && (
              <span className="text-xs font-medium text-blue-600 shrink-0">
                점수 {recommendation.score}
              </span>
            )}
          </div>
          {recommendation && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{recommendation.reason}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── AI Draft Flow ───────────────────────────────────────────────────

type DraftStep = 'idle' | 'recommending' | 'selecting' | 'streaming';

interface AiDraftFlowProps {
  coverLetterId: string;
  item: CoverLetterItemDto;
  aiDraft: string;
  setAiDraft: (v: string) => void;
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;
}

function AiDraftFlow({
  coverLetterId,
  item,
  aiDraft,
  setAiDraft,
  isStreaming,
  setIsStreaming,
}: AiDraftFlowProps) {
  const { data: experiences } = useExperiences();
  const [step, setStep] = useState<DraftStep>('idle');
  const [recommendations, setRecommendations] = useState<RecommendResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  const recommendedIds = new Set(recommendations.map((r) => r.experienceId));

  const displayedExperiences = (() => {
    if (!experiences) return [];
    if (showAll) return experiences;
    const recommended = experiences.filter((e) => recommendedIds.has(e.id));
    return recommended;
  })();

  const handleRecommend = async () => {
    setStep('recommending');
    setSelectedIds([]);
    setShowAll(false);
    try {
      const results = await fetchRecommendations(coverLetterId, item.id);
      const sorted = [...results].sort((a, b) => b.score - a.score);
      setRecommendations(sorted);
      setStep('selecting');
    } catch {
      setStep('idle');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleGenerateDraft = async () => {
    if (selectedIds.length === 0) return;
    setStep('streaming');
    setIsStreaming(true);
    setAiDraft('');
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${API_BASE}/cover-letters/${coverLetterId}/items/${item.id}/draft`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ experienceIds: selectedIds }),
        },
      );

      if (!res.ok || !res.body) {
        setIsStreaming(false);
        setStep('idle');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.error) {
              setIsStreaming(false);
              setStep('idle');
              return;
            }
            if (parsed.done) {
              setIsStreaming(false);
              setStep('idle');
              return;
            }
            if (parsed.delta) {
              accumulated += parsed.delta;
              setAiDraft(accumulated);
            }
          } catch {
            // 파싱 실패한 청크 무시
          }
        }
      }
    } catch {
      // 에러 무시
    } finally {
      setIsStreaming(false);
      setStep('idle');
    }
  };

  // Step 0: idle — show "AI 경험 추천받기" button
  if (step === 'idle') {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleRecommend}
        className="h-7 text-xs"
      >
        AI 경험 추천받기
      </Button>
    );
  }

  // Step 1: recommending — loading state
  if (step === 'recommending') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        질문을 분석하고 적합한 경험을 찾는 중...
      </div>
    );
  }

  // Step 2: selecting — show recommended experiences
  if (step === 'selecting') {
    const nonRecommended = experiences?.filter((e) => !recommendedIds.has(e.id)) ?? [];

    return (
      <div className="space-y-3">
        <div className="space-y-2">
          {displayedExperiences.map((exp) => {
            const rec = recommendations.find((r) => r.experienceId === exp.id);
            return (
              <ExperienceSelectCard
                key={exp.id}
                experience={exp}
                recommendation={rec}
                selected={selectedIds.includes(exp.id)}
                onToggle={() => toggleSelect(exp.id)}
              />
            );
          })}
          {showAll &&
            nonRecommended.map((exp) => (
              <ExperienceSelectCard
                key={exp.id}
                experience={exp}
                recommendation={undefined}
                selected={selectedIds.includes(exp.id)}
                onToggle={() => toggleSelect(exp.id)}
              />
            ))}
        </div>

        {!showAll && nonRecommended.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            전체 경험 보기 ({nonRecommended.length}개 더)
          </button>
        )}
        {showAll && (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            추천 경험만 보기
          </button>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleGenerateDraft}
            disabled={selectedIds.length === 0}
            className="h-7 text-xs"
          >
            선택한 경험으로 초안 생성 ({selectedIds.length}개)
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setStep('idle')}
            className="h-7 text-xs"
          >
            취소
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: streaming
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      <Loader2 className="w-3 h-3 animate-spin" />
      생성 중...
    </div>
  );
}

// ─── Cover Letter Item Card ─────────────────────────────────────────

interface ItemCardProps {
  coverLetterId: string;
  item: CoverLetterItemDto;
}

function ItemCard({ coverLetterId, item }: ItemCardProps) {
  const [userContent, setUserContent] = useState(item.userContent ?? '');
  const [aiDraft, setAiDraft] = useState(item.aiDraft ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveContent = useCallback(
    async (content: string) => {
      setIsSaving(true);
      try {
        await api.patch(`/cover-letters/${coverLetterId}/items/${item.id}`, {
          userContent: content,
        });
      } finally {
        setIsSaving(false);
      }
    },
    [coverLetterId, item.id],
  );

  const handleContentChange = (value: string) => {
    setUserContent(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveContent(value), 1000);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs shrink-0">
              {item.order}번
            </Badge>
            {item.charLimit && (
              <span className="text-xs text-slate-400">최대 {item.charLimit}자</span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-900 mt-2">{item.question}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>내 작성 내용</Label>
          {isSaving && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              저장 중...
            </span>
          )}
        </div>
        <Textarea
          rows={5}
          value={userContent}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="자기소개서 내용을 작성하세요"
          className="resize-none"
        />
        {item.charLimit && (
          <p className={`text-xs text-right ${userContent.length > item.charLimit ? 'text-red-500' : 'text-slate-400'}`}>
            {userContent.length} / {item.charLimit}자
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>AI 초안</Label>
          <AiDraftFlow
            coverLetterId={coverLetterId}
            item={item}
            aiDraft={aiDraft}
            setAiDraft={setAiDraft}
            isStreaming={isStreaming}
            setIsStreaming={setIsStreaming}
          />
        </div>
        <Textarea
          rows={5}
          value={aiDraft}
          readOnly
          placeholder="AI 경험 추천받기 버튼을 눌러 초안을 생성하세요"
          className="resize-none bg-slate-50 text-slate-700"
        />
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

export default function CoverLetterDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: coverLetter, isLoading } = useCoverLetter(id);
  const [showAddModal, setShowAddModal] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-3xl flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!coverLetter) {
    return (
      <div className="max-w-3xl">
        <p className="text-sm text-slate-500">자소서를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-slate-700 px-2"
          onClick={() => router.push('/cover-letter')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          목록으로
        </Button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{coverLetter.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {coverLetter.items?.length ?? 0}개 항목
          </p>
        </div>
        <Button
          className="flex items-center gap-2 shrink-0"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4" />
          항목 추가
        </Button>
      </div>

      {(!coverLetter.items || coverLetter.items.length === 0) && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">등록된 항목이 없습니다.</p>
          <p className="text-xs mt-1">위 버튼을 눌러 자소서 문항을 추가하세요.</p>
        </div>
      )}

      <div className="space-y-4">
        {coverLetter.items?.map((item) => (
          <ItemCard key={item.id} coverLetterId={id} item={item} />
        ))}
      </div>

      {showAddModal && (
        <AddItemModal
          coverLetterId={id}
          itemCount={coverLetter.items?.length ?? 0}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
