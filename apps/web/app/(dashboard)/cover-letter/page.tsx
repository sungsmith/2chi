'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCoverLetters, useCreateCoverLetter, useDeleteCoverLetter } from '@/hooks/use-cover-letters';
import { createCoverLetterSchema, type CreateCoverLetterInput, type CoverLetterDto } from '@2chi/shared';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: '초안', className: 'bg-slate-100 text-slate-600' },
  EDITING: { label: '작성 중', className: 'bg-blue-100 text-blue-700' },
  DONE: { label: '완료', className: 'bg-green-100 text-green-700' },
};

// ─── Add Cover Letter Modal ─────────────────────────────────────────

interface AddCoverLetterModalProps {
  onClose: () => void;
}

function AddCoverLetterModal({ onClose }: AddCoverLetterModalProps) {
  const create = useCreateCoverLetter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCoverLetterInput>({
    resolver: zodResolver(createCoverLetterSchema),
  });

  const onSubmit = async (data: CreateCoverLetterInput) => {
    await create.mutateAsync(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">자소서 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">
              제목 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="카카오 2024 공채 자소서"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
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

// ─── Cover Letter Card ──────────────────────────────────────────────

interface CoverLetterCardProps {
  coverLetter: CoverLetterDto;
}

function CoverLetterCard({ coverLetter }: CoverLetterCardProps) {
  const delete_ = useDeleteCoverLetter();
  const router = useRouter();
  const statusConfig = STATUS_CONFIG[coverLetter.status] ?? STATUS_CONFIG.DRAFT;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm group">
      <div className="flex items-start justify-between gap-3">
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => router.push(`/cover-letter/${coverLetter.id}`)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900 truncate">{coverLetter.title}</h3>
            <span
              className={`inline-block rounded-full text-xs font-medium px-2.5 py-0.5 ${statusConfig.className}`}
            >
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            {coverLetter.matchingScore !== null && (
              <span className="text-xs text-slate-500">
                매칭점수:{' '}
                <span className="font-medium text-slate-700">{coverLetter.matchingScore}점</span>
              </span>
            )}
            <span className="text-xs text-slate-400">
              {new Date(coverLetter.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('이 자소서를 삭제할까요?')) delete_.mutate(coverLetter.id);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1 shrink-0"
          aria-label="삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

export default function CoverLetterPage() {
  const { data: coverLetters, isLoading } = useCoverLetters();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">자소서</h1>
          <p className="text-sm text-slate-500 mt-0.5">자기소개서를 관리하세요.</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          자소서 추가
        </Button>
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {!isLoading && coverLetters?.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">작성된 자소서가 없습니다.</p>
          <p className="text-xs mt-1">위 버튼을 눌러 첫 자소서를 추가하세요.</p>
        </div>
      )}

      <div className="space-y-3">
        {coverLetters?.map((cl) => (
          <CoverLetterCard key={cl.id} coverLetter={cl} />
        ))}
      </div>

      {showModal && <AddCoverLetterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
