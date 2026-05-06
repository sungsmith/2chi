'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobPostingCard } from '@/components/job-posting/job-posting-card';
import { ScrapeModal } from '@/components/job-posting/scrape-modal';
import { useJobPostings } from '@/hooks/use-job-postings';

export default function JobPostingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: postings, isLoading } = useJobPostings();

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">채용공고</h1>
          <p className="text-sm text-slate-500 mt-0.5">스크랩한 채용공고를 관리하세요.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          채용공고 추가
        </Button>
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {!isLoading && postings?.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">스크랩한 채용공고가 없습니다.</p>
          <p className="text-xs mt-1">위에서 채용공고를 추가해보세요.</p>
        </div>
      )}

      <div className="grid gap-3">
        {postings?.map((posting) => (
          <JobPostingCard key={posting.id} posting={posting} />
        ))}
      </div>

      {modalOpen && <ScrapeModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
