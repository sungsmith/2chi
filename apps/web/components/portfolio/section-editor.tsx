'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { usePortfolioSectionDraft } from '@/hooks/use-portfolio-section-draft';
import { useUpdateSection } from '@/hooks/use-portfolios';
import type { PortfolioSectionDto } from '@2chi/shared';

interface SectionEditorProps {
  portfolioId: string;
  section: PortfolioSectionDto;
}

type DraftStatus = 'idle' | 'generating' | 'done';

export function SectionEditor({ portfolioId, section }: SectionEditorProps) {
  const [content, setContent] = useState(section.content);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [saveError, setSaveError] = useState('');

  const { stream, isStreaming, error: streamError, startStream } = usePortfolioSectionDraft(
    portfolioId,
    section.id,
  );
  const updateSection = useUpdateSection(portfolioId, section.id);

  useEffect(() => {
    if (isStreaming) {
      setDraftStatus('generating');
    } else if (stream && draftStatus === 'generating') {
      setContent(stream);
      setDraftStatus('done');
    }
  }, [isStreaming, stream, draftStatus]);

  const handleGenerateDraft = async () => {
    setDraftStatus('generating');
    setSaveError('');
    await startStream();
  };

  const handleSave = async () => {
    setSaveError('');
    try {
      await updateSection.mutateAsync({ content });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{section.title}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleGenerateDraft}
          disabled={draftStatus === 'generating'}
          className="h-7 text-xs"
        >
          {draftStatus === 'generating' ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              생성 중...
            </>
          ) : (
            'AI 초안 생성'
          )}
        </Button>
      </div>

      <div className="space-y-1">
        <Textarea
          rows={10}
          value={draftStatus === 'generating' ? stream : content}
          onChange={(e) => {
            if (draftStatus !== 'generating') setContent(e.target.value);
          }}
          readOnly={draftStatus === 'generating'}
          placeholder="섹션 내용을 작성하거나 AI 초안을 생성하세요"
          className="resize-none leading-relaxed"
        />
        {draftStatus === 'generating' && stream && (
          <span className="inline-block w-0.5 h-4 bg-slate-700 animate-pulse ml-0.5" aria-hidden />
        )}
      </div>

      {(saveError || streamError) && (
        <p className="text-xs text-red-500">{saveError || streamError}</p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={updateSection.isPending || draftStatus === 'generating'}
        >
          {updateSection.isPending ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  );
}
