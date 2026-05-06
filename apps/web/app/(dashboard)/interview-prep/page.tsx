'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InterviewPrepCard } from '@/components/interview-prep/interview-prep-card';
import {
  useInterviewPreps,
  useCreateInterviewPrep,
  useDeleteInterviewPrep,
} from '@/hooks/use-interview-preps';
import { useJobPostings } from '@/hooks/use-job-postings';
import {
  CreateInterviewPrepSchema,
  type CreateInterviewPrepInput,
} from '@2chi/shared';

// ─── Create Modal ────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
}

function CreateModal({ onClose }: CreateModalProps) {
  const create = useCreateInterviewPrep();
  const router = useRouter();
  const { data: jobPostings } = useJobPostings();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateInterviewPrepInput>({
    resolver: zodResolver(CreateInterviewPrepSchema),
  });

  const onSubmit = async (data: CreateInterviewPrepInput) => {
    const result = await create.mutateAsync(data);
    onClose();
    router.push(`/interview-prep/${result.id}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">새 면접 준비</h2>
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
              placeholder="2025 카카오 면접 준비"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>
          {jobPostings && jobPostings.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="jobPostingId">채용공고 연결 (선택)</Label>
              <select
                id="jobPostingId"
                {...register('jobPostingId')}
                className="w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">선택 안 함</option>
                {jobPostings.map((jp) => (
                  <option key={jp.id} value={jp.id}>
                    {jp.title}
                  </option>
                ))}
              </select>
            </div>
          )}
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

// ─── Page ────────────────────────────────────────────────────────────

export default function InterviewPrepPage() {
  const router = useRouter();
  const { data: interviewPreps, isLoading } = useInterviewPreps();
  const deletePrep = useDeleteInterviewPrep();
  const [showModal, setShowModal] = useState(false);

  const handleDelete = (id: string) => {
    if (confirm('이 면접 준비 세션을 삭제할까요?')) {
      deletePrep.mutate(id);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">면접 준비</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI로 예상 질문을 생성하고 답변을 연습하세요.</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          새 면접 준비
        </Button>
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {!isLoading && interviewPreps?.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">면접 준비 세션이 없습니다.</p>
          <p className="text-xs mt-1">위 버튼을 눌러 면접 준비를 시작하세요.</p>
        </div>
      )}

      <div className="space-y-3">
        {interviewPreps?.map((prep) => (
          <InterviewPrepCard
            key={prep.id}
            interviewPrep={prep}
            onClick={() => router.push(`/interview-prep/${prep.id}`)}
            onDelete={() => handleDelete(prep.id)}
          />
        ))}
      </div>

      {showModal && <CreateModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
