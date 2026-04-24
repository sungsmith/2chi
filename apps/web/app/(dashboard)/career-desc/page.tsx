'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CareerDescCard } from '@/components/career-desc/career-desc-card';
import {
  useCareerDescriptions,
  useCreateCareerDescription,
  useDeleteCareerDescription,
} from '@/hooks/use-career-descriptions';
import {
  createCareerDescriptionSchema,
  type CreateCareerDescriptionInput,
  type CareerDescriptionDto,
} from '@2chi/shared';

// ─── Create Modal ────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
}

function CreateModal({ onClose }: CreateModalProps) {
  const create = useCreateCareerDescription();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCareerDescriptionInput>({
    resolver: zodResolver(createCareerDescriptionSchema),
  });

  const onSubmit = async (data: CreateCareerDescriptionInput) => {
    const result = await create.mutateAsync(data);
    onClose();
    router.push(`/career-desc/${result.id}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">경력기술서 추가</h2>
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
              placeholder="2025 이직용 경력기술서"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="versionLabel">버전 (선택)</Label>
            <Input
              id="versionLabel"
              placeholder="v1.0"
              {...register('versionLabel')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="targetJobType">목표 직무 (선택)</Label>
            <Input
              id="targetJobType"
              placeholder="프론트엔드 개발자"
              {...register('targetJobType')}
            />
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

// ─── List Item with Delete ───────────────────────────────────────────

interface CareerDescListItemProps {
  careerDescription: CareerDescriptionDto;
}

function CareerDescListItem({ careerDescription }: CareerDescListItemProps) {
  const router = useRouter();
  const delete_ = useDeleteCareerDescription();

  return (
    <div className="relative group">
      <CareerDescCard
        careerDescription={careerDescription}
        onClick={() => router.push(`/career-desc/${careerDescription.id}`)}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('이 경력기술서를 삭제할까요?')) delete_.mutate(careerDescription.id);
        }}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
        aria-label="삭제"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function CareerDescPage() {
  const { data: careerDescriptions, isLoading } = useCareerDescriptions();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">경력기술서</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI로 경력기술서를 작성하세요.</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          경력기술서 추가
        </Button>
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {!isLoading && careerDescriptions?.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">작성된 경력기술서가 없습니다.</p>
          <p className="text-xs mt-1">위 버튼을 눌러 첫 경력기술서를 추가하세요.</p>
        </div>
      )}

      <div className="space-y-3">
        {careerDescriptions?.map((cd) => (
          <CareerDescListItem key={cd.id} careerDescription={cd} />
        ))}
      </div>

      {showModal && <CreateModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
