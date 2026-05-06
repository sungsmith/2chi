'use client';

import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CreatePortfolioSchema,
  type CreatePortfolioInput,
} from '@2chi/shared';

const TEMPLATE_OPTIONS = [
  { value: 'basic', label: '기본' },
  { value: 'modern', label: '모던' },
  { value: 'minimal', label: '미니멀' },
];

interface PortfolioFormProps {
  onClose: () => void;
  onSubmit: (data: CreatePortfolioInput) => Promise<void>;
  isPending: boolean;
}

export function PortfolioForm({ onClose, onSubmit, isPending }: PortfolioFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePortfolioInput>({
    resolver: zodResolver(CreatePortfolioSchema),
    defaultValues: { templateId: 'basic', versionLabel: 'v1.0' },
  });

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">포트폴리오 추가</h2>
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
              placeholder="2025 개발자 포트폴리오"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="templateId">
              템플릿 <span className="text-red-500">*</span>
            </Label>
            <select
              id="templateId"
              {...register('templateId')}
              className="w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {TEMPLATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.templateId && (
              <p className="text-xs text-red-500">{errors.templateId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="versionLabel">
              버전 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="versionLabel"
              placeholder="v1.0"
              {...register('versionLabel')}
            />
            {errors.versionLabel && (
              <p className="text-xs text-red-500">{errors.versionLabel.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? '추가 중...' : '추가'}
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
