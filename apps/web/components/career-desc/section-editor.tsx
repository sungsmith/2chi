'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSectionDraft } from '@/hooks/use-section-draft';
import { useUpdateSection } from '@/hooks/use-career-descriptions';
import type { CareerDescriptionSectionDto } from '@2chi/shared';

const SECTION_TYPE_LABEL: Record<string, string> = {
  INTRO: '소개',
  EXPERIENCE: '경험',
  SKILL: '기술',
  ACHIEVEMENT: '성과',
  CUSTOM: '기타',
};

const SECTION_TYPE_COLOR: Record<string, string> = {
  INTRO: 'bg-blue-50 text-blue-700',
  EXPERIENCE: 'bg-green-50 text-green-700',
  SKILL: 'bg-amber-50 text-amber-700',
  ACHIEVEMENT: 'bg-purple-50 text-purple-700',
  CUSTOM: 'bg-slate-100 text-slate-600',
};

type DraftStatus = 'idle' | 'generating' | 'done';

interface SectionEditorProps {
  careerDescriptionId: string;
  section: CareerDescriptionSectionDto;
}

export function SectionEditor({ careerDescriptionId, section }: SectionEditorProps) {
  const [heading, setHeading] = useState(section.content.heading);
  const [body, setBody] = useState(section.content.body);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [saveError, setSaveError] = useState('');

  const { stream, isStreaming, startStream } = useSectionDraft(careerDescriptionId, section.id);
  const updateSection = useUpdateSection();

  useEffect(() => {
    if (isStreaming) {
      setDraftStatus('generating');
    } else if (stream && draftStatus === 'generating') {
      setBody(stream);
      setDraftStatus('done');
    }
  }, [isStreaming, stream, draftStatus]);

  const handleGenerateDraft = async () => {
    setDraftStatus('generating');
    setSaveError('');
    await startStream({
      targetJobType: undefined,
      experienceIds: undefined,
    });
  };

  const handleSave = async () => {
    setSaveError('');
    try {
      await updateSection.mutateAsync({
        careerDescriptionId,
        sectionId: section.id,
        data: { content: { heading, body } },
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    }
  };

  const typeLabel = SECTION_TYPE_LABEL[section.sectionType] ?? section.sectionType;
  const typeColor = SECTION_TYPE_COLOR[section.sectionType] ?? SECTION_TYPE_COLOR.CUSTOM;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`rounded-full text-xs font-medium px-2.5 py-0.5 ${typeColor}`}>
            {typeLabel}
          </span>
          <span className="text-xs text-slate-400">{section.order + 1}번 섹션</span>
        </div>
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

      <div className="space-y-1.5">
        <Label htmlFor={`heading-${section.id}`}>제목</Label>
        <Input
          id={`heading-${section.id}`}
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          placeholder="섹션 제목"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`body-${section.id}`}>내용</Label>
        <Textarea
          id={`body-${section.id}`}
          rows={8}
          value={draftStatus === 'generating' ? stream : body}
          onChange={(e) => {
            if (draftStatus !== 'generating') setBody(e.target.value);
          }}
          readOnly={draftStatus === 'generating'}
          placeholder="섹션 내용을 작성하거나 AI 초안을 생성하세요"
          className="resize-none leading-relaxed"
        />
        {draftStatus === 'generating' && stream && (
          <span className="inline-block w-0.5 h-4 bg-slate-700 animate-pulse ml-0.5" aria-hidden />
        )}
      </div>

      {saveError && (
        <p className="text-xs text-red-500">{saveError}</p>
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
