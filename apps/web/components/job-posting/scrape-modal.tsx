'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Link2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useScrapeJobPosting, useParseJobPosting } from '@/hooks/use-job-postings';
import { scrapeJobPostingSchema, parseJobPostingSchema } from '@2chi/shared';
import type { ScrapeJobPostingInput, ParseJobPostingInput, JobPostingDto } from '@2chi/shared';

type Stage = 'url' | 'fallback' | 'confirm';

interface ScrapeModalProps {
  onClose: () => void;
}

export function ScrapeModal({ onClose }: ScrapeModalProps) {
  const [stage, setStage] = useState<Stage>('url');
  const [result, setResult] = useState<JobPostingDto | null>(null);

  const scrape = useScrapeJobPosting();
  const parse = useParseJobPosting();

  const urlForm = useForm<ScrapeJobPostingInput>({
    resolver: zodResolver(scrapeJobPostingSchema),
  });

  const textForm = useForm<ParseJobPostingInput>({
    resolver: zodResolver(parseJobPostingSchema),
  });

  const handleScrape = async (data: ScrapeJobPostingInput) => {
    try {
      const posting = await scrape.mutateAsync(data);
      setResult(posting);
      setStage('confirm');
    } catch {
      setStage('fallback');
    }
  };

  const handleParse = async (data: ParseJobPostingInput) => {
    const posting = await parse.mutateAsync(data);
    setResult(posting);
    setStage('confirm');
  };

  const handleSave = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg border border-slate-200 shadow-sm w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">채용공고 추가</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {stage === 'url' && (
            <form onSubmit={urlForm.handleSubmit(handleScrape)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="url">채용공고 URL</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="url"
                      placeholder="https://..."
                      className="pl-9"
                      {...urlForm.register('url')}
                    />
                  </div>
                  <Button type="submit" disabled={scrape.isPending}>
                    {scrape.isPending ? '불러오는 중...' : '스크랩'}
                  </Button>
                </div>
                {urlForm.formState.errors.url && (
                  <p className="text-xs text-red-500">{urlForm.formState.errors.url.message}</p>
                )}
              </div>
              {scrape.isPending && (
                <p className="text-xs text-slate-500">채용공고를 불러오는 중입니다... (최대 15초 소요)</p>
              )}
            </form>
          )}

          {stage === 'fallback' && (
            <div className="space-y-4">
              <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-sm text-amber-800">
                  해당 사이트는 자동 수집이 어렵습니다. 공고 내용을 직접 붙여넣어 주세요.
                </p>
              </div>
              <form onSubmit={textForm.handleSubmit(handleParse)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="text">공고 내용</Label>
                  <textarea
                    id="text"
                    rows={8}
                    placeholder="채용공고 페이지의 텍스트를 복사해서 붙여넣으세요."
                    className="w-full rounded-md bg-white border border-slate-300 px-4 py-3 text-sm text-slate-900 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    {...textForm.register('text')}
                  />
                  {textForm.formState.errors.text && (
                    <p className="text-xs text-red-500">{textForm.formState.errors.text.message}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => setStage('url')}
                    className="rounded-md bg-slate-100 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-200 transition-colors"
                  >
                    돌아가기
                  </Button>
                  <Button type="submit" disabled={parse.isPending}>
                    {parse.isPending ? '분석 중...' : '저장'}
                  </Button>
                </div>
                {parse.isError && (
                  <p className="text-xs text-red-500">분석에 실패했습니다. 다시 시도해주세요.</p>
                )}
              </form>
            </div>
          )}

          {stage === 'confirm' && result && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">공고 제목</p>
                  <p className="text-sm text-slate-900">{result.title}</p>
                </div>
                {result.department && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">부서·직무</p>
                    <p className="text-sm text-slate-900">{result.department}</p>
                  </div>
                )}
                {result.requiredCompetencies.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">필수 역량</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.requiredCompetencies.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-slate-100 text-slate-600 text-xs px-2 py-1"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.preferredCompetencies.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">우대 사항</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.preferredCompetencies.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-blue-50 text-blue-700 text-xs px-2 py-1"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  onClick={() => setStage('url')}
                  className="rounded-md bg-slate-100 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-200 transition-colors"
                >
                  다시 입력
                </Button>
                <Button onClick={handleSave}>저장</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
