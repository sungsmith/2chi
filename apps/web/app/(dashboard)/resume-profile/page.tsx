'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResumeProfileCard } from '@/components/resume-profile/resume-profile-card';
import {
  useResumeProfiles,
  useCreateResumeProfile,
  useDeleteResumeProfile,
} from '@/hooks/use-resume-profiles';

const createFormSchema = z.object({
  name: z.string().min(1, '프로필 이름을 입력하세요').max(100),
  description: z.string().max(300).default(''),
});

type CreateFormValues = z.infer<typeof createFormSchema>;

function CreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const create = useCreateResumeProfile();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
  });

  const onSubmit = async (data: CreateFormValues) => {
    const result = await create.mutateAsync({
      name: data.name,
      description: data.description ?? '',
      selectedExperienceIds: [],
    });
    onClose();
    router.push(`/resume-profile/${result.id}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">이력 프로필 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              프로필 이름 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="마케팅용 이력, 개발자 이직용 등"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">설명 (선택)</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="이 프로필의 목적이나 대상 직무를 간단히 적어주세요."
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
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

export default function ResumeProfilePage() {
  const router = useRouter();
  const { data: profiles, isLoading } = useResumeProfiles();
  const deleteProfile = useDeleteResumeProfile();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">이력 프로필</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            지원 목적별로 경험을 선별해 프로필을 만드세요.
          </p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          새 프로필
        </Button>
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {!isLoading && profiles?.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">작성된 이력 프로필이 없습니다.</p>
          <p className="text-xs mt-1">위 버튼을 눌러 첫 프로필을 추가하세요.</p>
        </div>
      )}

      <div className="space-y-3">
        {profiles?.map((profile) => (
          <ResumeProfileCard
            key={profile.id}
            profile={profile}
            onClick={() => router.push(`/resume-profile/${profile.id}`)}
            onDelete={() => {
              if (confirm('이 이력 프로필을 삭제할까요?')) deleteProfile.mutate(profile.id);
            }}
          />
        ))}
      </div>

      {showModal && <CreateModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
