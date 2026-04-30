'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionList } from '@/components/portfolio/section-list';
import { SectionEditor } from '@/components/portfolio/section-editor';
import {
  usePortfolio,
  useCreateSection,
  useReorderSections,
  useGeneratePortfolioPdf,
} from '@/hooks/use-portfolios';
import {
  CreatePortfolioSectionSchema,
  type CreatePortfolioSectionInput,
  type PortfolioSectionDto,
} from '@2chi/shared';

const SECTION_TYPE_OPTIONS = [
  { value: 'INTRO', label: '소개' },
  { value: 'PROJECT', label: '프로젝트' },
  { value: 'SKILLS', label: '기술' },
  { value: 'ACHIEVEMENT', label: '성과' },
  { value: 'CUSTOM', label: '기타' },
];

// ─── Add Section Modal ───────────────────────────────────────────────

interface AddSectionModalProps {
  portfolioId: string;
  sectionCount: number;
  onClose: () => void;
}

function AddSectionModal({ portfolioId, sectionCount, onClose }: AddSectionModalProps) {
  const createSection = useCreateSection(portfolioId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePortfolioSectionInput>({
    resolver: zodResolver(CreatePortfolioSectionSchema),
    defaultValues: { type: 'INTRO', content: '', order: sectionCount },
  });

  const onSubmit = async (data: CreatePortfolioSectionInput) => {
    await createSection.mutateAsync({ ...data, order: sectionCount });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">섹션 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="type">
              섹션 타입 <span className="text-red-500">*</span>
            </Label>
            <select
              id="type"
              {...register('type')}
              className="w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SECTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sectionTitle">
              제목 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="sectionTitle"
              placeholder="섹션 제목"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={createSection.isPending} className="flex-1">
              {createSection.isPending ? '추가 중...' : '추가'}
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

// ─── Page ────────────────────────────────────────────────────────────

export default function PortfolioDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: portfolio, isLoading } = usePortfolio(id);
  const reorderSections = useReorderSections(id);
  const generatePdf = useGeneratePortfolioPdf(id);

  const [selectedSection, setSelectedSection] = useState<PortfolioSectionDto | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const handleDownloadPdf = async () => {
    setPdfError('');
    try {
      const { url } = await generatePdf.mutateAsync();
      window.open(url, '_blank');
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'PDF 생성에 실패했습니다.');
    }
  };

  const handleMoveUp = (sectionId: string) => {
    if (!portfolio?.sections) return;
    const sorted = [...portfolio.sections].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === sectionId);
    if (idx <= 0) return;
    const newOrder = sorted.map((s) => s.id);
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    reorderSections.mutate(newOrder);
  };

  const handleMoveDown = (sectionId: string) => {
    if (!portfolio?.sections) return;
    const sorted = [...portfolio.sections].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === sectionId);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const newOrder = sorted.map((s) => s.id);
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    reorderSections.mutate(newOrder);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="max-w-5xl">
        <p className="text-sm text-slate-500">포트폴리오를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-slate-700 px-2"
          onClick={() => router.push('/portfolio')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          목록으로
        </Button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{portfolio.title}</h1>
            {portfolio.versionLabel && (
              <span className="inline-block rounded-full text-xs font-medium px-2.5 py-0.5 bg-slate-100 text-slate-600">
                {portfolio.versionLabel}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {portfolio.sections?.length ?? 0}개 섹션
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Button
            className="flex items-center gap-2"
            onClick={handleDownloadPdf}
            disabled={generatePdf.isPending}
          >
            {generatePdf.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                PDF 다운로드
              </>
            )}
          </Button>
          {pdfError && <p className="text-xs text-red-500">{pdfError}</p>}
        </div>
      </div>

      <div className="flex gap-6">
        {/* 좌측: 섹션 목록 */}
        <div className="w-56 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide">섹션</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              추가
            </button>
          </div>

          {(!portfolio.sections || portfolio.sections.length === 0) ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-xs">섹션이 없습니다.</p>
              <p className="text-xs mt-0.5">위 추가 버튼을 눌러 섹션을 추가하세요.</p>
            </div>
          ) : (
            <SectionList
              sections={portfolio.sections}
              selectedId={selectedSection?.id ?? null}
              onSelect={setSelectedSection}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          )}
        </div>

        {/* 우측: 섹션 편집기 */}
        <div className="flex-1 min-w-0">
          {selectedSection ? (
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <SectionEditor
                key={selectedSection.id}
                portfolioId={id}
                section={selectedSection}
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm flex items-center justify-center py-16 text-slate-400">
              <p className="text-sm">좌측에서 섹션을 선택하세요.</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddSectionModal
          portfolioId={id}
          sectionCount={portfolio.sections?.length ?? 0}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
