'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, Loader2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCoverLetter, useAddCoverLetterItem } from '@/hooks/use-cover-letters';
import { createCoverLetterItemSchema, type CreateCoverLetterItemInput, type CoverLetterItemDto } from '@2chi/shared';
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

// ─── Add Item Modal ─────────────────────────────────────────────────

interface AddItemModalProps {
  coverLetterId: string;
  onClose: () => void;
}

function AddItemModal({ coverLetterId, onClose }: AddItemModalProps) {
  const addItem = useAddCoverLetterItem(coverLetterId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCoverLetterItemInput>({
    resolver: zodResolver(createCoverLetterItemSchema),
  });

  const onSubmit = async (data: CreateCoverLetterItemInput) => {
    await addItem.mutateAsync(data);
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
            <Input
              id="charLimit"
              type="number"
              placeholder="1000"
              {...register('charLimit', { valueAsNumber: true })}
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

  const handleGenerateDraft = async () => {
    setIsStreaming(true);
    setAiDraft('');
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${API_BASE}/cover-letters/${coverLetterId}/items/${item.id}/draft`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!res.ok || !res.body) {
        setIsStreaming(false);
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
              return;
            }
            if (parsed.done) {
              setIsStreaming(false);
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
    }
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleGenerateDraft}
            disabled={isStreaming}
            className="h-7 text-xs"
          >
            {isStreaming ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                생성 중...
              </>
            ) : (
              'AI 초안 생성'
            )}
          </Button>
        </div>
        <Textarea
          rows={5}
          value={aiDraft}
          readOnly
          placeholder="AI 초안 생성 버튼을 눌러 초안을 생성하세요"
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
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
