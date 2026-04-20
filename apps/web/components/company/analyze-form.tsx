'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Building2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnalyzeCompany, useCompanies } from '@/hooks/use-companies';
import { analyzeCompanySchema, type AnalyzeCompanyInput, type CompanyDto } from '@2chi/shared';

type AnalyzeApiResponse =
  | { cached: true; company: CompanyDto }
  | { cached: false; jobId: string };

interface Props {
  onQueued?: () => void;
}

export function AnalyzeForm({ onQueued }: Props) {
  const router = useRouter();
  const analyze = useAnalyzeCompany();
  const { data: allCompanies } = useCompanies();

  const [nameInput, setNameInput] = useState('');
  const [debouncedName, setDebouncedName] = useState('');
  const [suggestions, setSuggestions] = useState<CompanyDto[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFromList, setSelectedFromList] = useState(false);
  const [queuedMessage, setQueuedMessage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AnalyzeCompanyInput>({
    resolver: zodResolver(analyzeCompanySchema),
  });

  // Debounce name input by 300ms
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
    setQueuedMessage('');
  };

  const onSubmit = async (data: AnalyzeCompanyInput) => {
    setQueuedMessage('');
    const res = await analyze.mutateAsync(data);
    if (!res.success) return;

    const payload = res.data as unknown as AnalyzeApiResponse;

    if (payload.cached && payload.company?.id) {
      router.push(`/company/${payload.company.id}`);
    } else {
      setQueuedMessage(data.name);
      onQueued?.();
    }
  };

  return (
    <div ref={containerRef}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 relative">
            <Label htmlFor="name">기업명</Label>
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
        {queuedMessage && (
          <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-700 flex items-center justify-between gap-4">
            <span>"{queuedMessage}" 분석을 시작했습니다.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/company')}
            >
              결과 보기
            </Button>
          </div>
        )}
        <Button type="submit" disabled={analyze.isPending}>
          {analyze.isPending ? 'AI 분석 중...' : '기업 분석 시작'}
        </Button>
      </form>
    </div>
  );
}
