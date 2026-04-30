'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PortfolioCard } from '@/components/portfolio/portfolio-card';
import { PortfolioForm } from '@/components/portfolio/portfolio-form';
import { usePortfolios, useCreatePortfolio, useDeletePortfolio } from '@/hooks/use-portfolios';
import type { CreatePortfolioInput } from '@2chi/shared';

export default function PortfolioPage() {
  const router = useRouter();
  const { data: portfolios, isLoading } = usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const deletePortfolio = useDeletePortfolio();
  const [showModal, setShowModal] = useState(false);

  const handleCreate = async (data: CreatePortfolioInput) => {
    const result = await createPortfolio.mutateAsync(data);
    setShowModal(false);
    router.push(`/portfolio/${result.id}`);
  };

  const handleDelete = (id: string) => {
    if (confirm('이 포트폴리오를 삭제할까요?')) {
      deletePortfolio.mutate(id);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">포트폴리오</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI로 포트폴리오를 작성하세요.</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          포트폴리오 추가
        </Button>
      </div>

      {isLoading && <div className="text-sm text-slate-500">불러오는 중...</div>}

      {!isLoading && portfolios?.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">작성된 포트폴리오가 없습니다.</p>
          <p className="text-xs mt-1">위 버튼을 눌러 첫 포트폴리오를 추가하세요.</p>
        </div>
      )}

      <div className="space-y-3">
        {portfolios?.map((portfolio) => (
          <PortfolioCard
            key={portfolio.id}
            portfolio={portfolio}
            onClick={() => router.push(`/portfolio/${portfolio.id}`)}
            onDelete={() => handleDelete(portfolio.id)}
          />
        ))}
      </div>

      {showModal && (
        <PortfolioForm
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          isPending={createPortfolio.isPending}
        />
      )}
    </div>
  );
}
