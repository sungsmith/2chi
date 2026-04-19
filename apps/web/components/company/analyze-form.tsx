'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnalyzeCompany } from '@/hooks/use-companies';
import { analyzeCompanySchema, type AnalyzeCompanyInput, type CompanyDto } from '@2chi/shared';

interface Props {
  onAnalyzed: (company: CompanyDto) => void;
}

export function AnalyzeForm({ onAnalyzed }: Props) {
  const analyze = useAnalyzeCompany();
  const { register, handleSubmit, formState: { errors } } = useForm<AnalyzeCompanyInput>({
    resolver: zodResolver(analyzeCompanySchema),
  });

  const onSubmit = async (data: AnalyzeCompanyInput) => {
    const res = await analyze.mutateAsync(data);
    if (res.success) onAnalyzed(res.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">기업명</Label>
          <Input id="name" placeholder="카카오" {...register('name')} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jobTitle">지원 직무 (선택)</Label>
          <Input id="jobTitle" placeholder="프론트엔드 개발자" {...register('jobTitle')} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="additionalContext">추가 맥락 (선택)</Label>
        <Input
          id="additionalContext"
          placeholder="채용공고에서 특별히 강조한 내용, 사업부 정보 등"
          {...register('additionalContext')}
        />
      </div>
      {analyze.data && !analyze.data.success && (
        <p className="text-xs text-red-500">{analyze.data.error.message}</p>
      )}
      <Button type="submit" disabled={analyze.isPending}>
        {analyze.isPending ? 'AI 분석 중...' : '기업 분석 시작'}
      </Button>
    </form>
  );
}
