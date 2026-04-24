'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateApplication } from '@/hooks/use-applications';

const addApplicationFormSchema = z.object({
  companyName: z.string().min(1, '회사명을 입력하세요.').max(100),
  appliedAt: z.string().optional(),
  currentStage: z
    .enum(['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'OFFER', 'DONE', 'CUSTOM'])
    .default('DOCUMENT'),
});

type AddApplicationFormValues = z.infer<typeof addApplicationFormSchema>;

interface Props {
  onClose: () => void;
}

export function AddApplicationModal({ onClose }: Props) {
  const create = useCreateApplication();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddApplicationFormValues>({
    resolver: zodResolver(addApplicationFormSchema),
    defaultValues: { currentStage: 'DOCUMENT' },
  });

  const onSubmit = async (data: AddApplicationFormValues) => {
    const res = await create.mutateAsync({
      appliedAt: data.appliedAt,
      currentStage: data.currentStage,
      memo: data.companyName,
    });
    if (res.success) onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">지원 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">
              회사명 <span className="text-red-500">*</span>
            </Label>
            <Input id="companyName" placeholder="카카오" {...register('companyName')} />
            {errors.companyName && (
              <p className="text-xs text-red-500">{errors.companyName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="appliedAt">지원일 (선택)</Label>
            <Input id="appliedAt" type="date" {...register('appliedAt')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currentStage">현재 단계</Label>
            <select
              id="currentStage"
              {...register('currentStage')}
              className="w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DOCUMENT">서류</option>
              <option value="FIRST_INTERVIEW">1차 면접</option>
              <option value="SECOND_INTERVIEW">2차 면접</option>
              <option value="OFFER">오퍼</option>
              <option value="CUSTOM">기타</option>
              <option value="DONE">완료</option>
            </select>
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
