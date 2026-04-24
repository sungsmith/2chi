'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionEditor } from '@/components/career-desc/section-editor';
import { useCareerDescription, useGeneratePdf } from '@/hooks/use-career-descriptions';

export default function CareerDescDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: careerDescription, isLoading } = useCareerDescription(id);
  const generatePdf = useGeneratePdf();
  const [pdfError, setPdfError] = useState('');

  const handleDownloadPdf = async () => {
    setPdfError('');
    try {
      const signedUrl = await generatePdf.mutateAsync(id);
      window.open(signedUrl, '_blank');
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'PDF 생성에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!careerDescription) {
    return (
      <div className="max-w-3xl">
        <p className="text-sm text-slate-500">경력기술서를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-slate-700 px-2"
          onClick={() => router.push('/career-desc')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          목록으로
        </Button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{careerDescription.title}</h1>
            {careerDescription.versionLabel && (
              <span className="inline-block rounded-full text-xs font-medium px-2.5 py-0.5 bg-slate-100 text-slate-600">
                {careerDescription.versionLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-500">
              {careerDescription.sections?.length ?? 0}개 섹션
            </p>
            {careerDescription.targetJobType && (
              <p className="text-sm text-slate-400">{careerDescription.targetJobType}</p>
            )}
          </div>
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
          {pdfError && (
            <p className="text-xs text-red-500">{pdfError}</p>
          )}
        </div>
      </div>

      {(!careerDescription.sections || careerDescription.sections.length === 0) && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">등록된 섹션이 없습니다.</p>
          <p className="text-xs mt-1">API를 통해 섹션을 추가하세요.</p>
        </div>
      )}

      <div className="space-y-4">
        {careerDescription.sections
          ?.slice()
          .sort((a, b) => a.order - b.order)
          .map((section) => (
            <SectionEditor
              key={section.id}
              careerDescriptionId={id}
              section={section}
            />
          ))}
      </div>
    </div>
  );
}
