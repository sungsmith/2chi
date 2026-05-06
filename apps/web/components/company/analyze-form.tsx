'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Building2, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAnalyzeCompany, useCompanies, useCompanyJobStatus } from '@/hooks/use-companies';
import { analyzeCompanySchema, type AnalyzeCompanyInput, type CompanyDto } from '@2chi/shared';

export function AnalyzeForm() {
  const router = useRouter();
  const analyze = useAnalyzeCompany();
  const { data: allCompanies } = useCompanies();

  const [nameInput, setNameInput] = useState('');
  const [debouncedName, setDebouncedName] = useState('');
  const [suggestions, setSuggestions] = useState<CompanyDto[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFromList, setSelectedFromList] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: jobStatus } = useCompanyJobStatus(pendingJobId);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AnalyzeCompanyInput>({
    resolver: zodResolver(analyzeCompanySchema),
  });

  const [jobError, setJobError] = useState<string | null>(null);

  // 분석 완료/실패 처리
  useEffect(() => {
    if (!pendingJobId) return;
    if (jobStatus?.status === 'completed') {
      setPendingJobId(null);
      router.push('/company');
    } else if (jobStatus?.status === 'failed') {
      setPendingJobId(null);
      setJobError('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }, [jobStatus, pendingJobId, router]);

  // Debounce name input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedName(nameInput), 300);
    return () => clearTimeout(timer);
  }, [nameInput]);

  // Filter companies client-side
  useEffect(() => {
    if (!debouncedName.trim() || !allCompanies) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const lower = debouncedName.toLowerCase();
    const matched = allCompanies
      .filter((c) => c.name.toLowerCase().includes(lower))
      .slice(0, 5);
    setSuggestions(matched);
    setShowSuggestions(matched.length > 0 && !selectedFromList);
  }, [debouncedName, allCompanies, selectedFromList]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectSuggestion = (company: CompanyDto) => {
    setSelectedFromList(true);
    setShowSuggestions(false);
    router.push(`/company/${company.id}`);
  };

  const handleNameChange = (value: string) => {
    setNameInput(value);
    setValue('name', value);
    setSelectedFromList(false);
  };

  const onSubmit = async (data: AnalyzeCompanyInput) => {
    setJobError(null);
    try {
      const result = await analyze.mutateAsync(data);
      if (result.cached) {
        router.push(`/company/${result.company.id}`);
      } else {
        setPendingJobId(result.jobId);
      }
    } catch {
      // error surfaced via analyze.isError
    }
  };

  const isPending = analyze.isPending || !!pendingJobId;

  return (
    <div ref={containerRef}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* 기업명 */}
        <div className="space-y-1.5 relative">
          <Label htmlFor="name">기업명 *</Label>
          <Input
            id="name"
            placeholder="카카오"
            autoComplete="off"
            {...register('name')}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0 && !selectedFromList) setShowSuggestions(true);
            }}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}

          {showSuggestions && (
            <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-md shadow-md overflow-hidden">
              <p className="text-xs text-slate-400 px-3 pt-2 pb-1">기존 기업 선택</p>
              {suggestions.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => handleSelectSuggestion(company)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="flex-1 truncate text-slate-800">{company.name}</span>
                  {company.analyzedAt && (
                    <span className="text-xs text-green-600 shrink-0">분석 완료</span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                </button>
              ))}
              <div className="border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuggestions(false);
                    setSelectedFromList(true);
                  }}
                  className="w-full px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 text-left transition-colors"
                >
                  새 기업으로 분석 →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 채용공고 */}
        <div className="space-y-1.5">
          <Label htmlFor="jobPostingText">
            채용공고 텍스트{' '}
            <span className="text-slate-400 font-normal text-xs">(붙여넣기 권장 — 직무·역량·갭 분석에 활용)</span>
          </Label>
          <Textarea
            id="jobPostingText"
            rows={8}
            placeholder="채용공고 페이지 전체 내용을 붙여넣으세요. 직무 요건, 우대 사항, 지원 자격 등이 포함될수록 분석 품질이 높아집니다."
            className="resize-y text-sm"
            {...register('jobPostingText')}
          />
          {errors.jobPostingText && (
            <p className="text-xs text-red-500">{errors.jobPostingText.message}</p>
          )}
        </div>

        {/* 추가 맥락 */}
        <div className="space-y-1.5">
          <Label htmlFor="additionalContext">추가 맥락 (선택)</Label>
          <Input
            id="additionalContext"
            placeholder="특정 사업부, 팀 문화, 강조된 키워드 등"
            {...register('additionalContext')}
          />
        </div>

        {(analyze.isError || jobError) && (
          <p className="text-xs text-red-500">
            {jobError ?? (analyze.error instanceof Error ? analyze.error.message : '분석에 실패했습니다.')}
          </p>
        )}

        {pendingJobId && (
          <p className="text-xs text-blue-600 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            기업과 직무를 분석하는 중입니다... 완료되면 자동으로 이동합니다.
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI 분석 중...
            </span>
          ) : (
            '기업 + 직무 분석 시작'
          )}
        </Button>
      </form>
    </div>
  );
}
