'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateApplication } from '@/hooks/use-applications';
import { createApplicationSchema, type CreateApplicationInput } from '@2chi/shared';

interface Props {
  onClose: () => void;
}

export function AddApplicationModal({ onClose }: Props) {
  const create = useCreateApplication();

  const { register, handleSubmit } = useForm<CreateApplicationInput>({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: { currentStage: 'DOCUMENT' },
  });

  const onSubmit = async (data: CreateApplicationInput) => {
    const res = await create.mutateAsync(data);
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
              <option value="FINAL_INTERVIEW">최종 면접</option>
              <option value="OFFER">오퍼</option>
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
