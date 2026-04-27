'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OnboardingParseResultDto } from '@2chi/shared';
import { useParseResume } from '@/hooks/use-onboarding';

interface ResumeUploadZoneProps {
  onSuccess: (result: OnboardingParseResultDto) => void;
}

const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function ResumeUploadZone({ onSuccess }: ResumeUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const parseResume = useParseResume();

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'PDF 또는 DOCX 파일만 업로드할 수 있습니다.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return '파일 크기는 10MB 이하여야 합니다.';
    }
    return null;
  }

  function handleFileSelect(file: File) {
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
      return;
    }
    setValidationError(null);
    setSelectedFile(file);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    try {
      const result = await parseResume.mutateAsync(selectedFile);
      onSuccess(result);
    } catch {
      // error displayed via parseResume.error
    }
  }

  const isPending = parseResume.isPending;
  const errorMessage = parseResume.error?.message ?? validationError;

  return (
    <div className="space-y-4">
      <div
        onClick={() => !isPending && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer',
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400',
          isPending ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={handleInputChange}
          disabled={isPending}
        />
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        {selectedFile ? (
          <p className="text-sm font-medium text-slate-700">{selectedFile.name}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-700">파일을 끌어다 놓거나 클릭해서 선택하세요</p>
            <p className="text-xs text-slate-400 mt-1">PDF, DOCX · 10MB 이하</p>
          </>
        )}
      </div>

      {errorMessage && (
        <p className="text-sm text-red-500">{errorMessage}</p>
      )}

      {isPending ? (
        <div className="text-sm text-slate-500 text-center py-2">
          이력서를 분석하고 있습니다... 최대 20초 소요됩니다.
        </div>
      ) : (
        <Button
          onClick={handleAnalyze}
          disabled={!selectedFile || isPending}
          className="w-full"
        >
          분석 시작
        </Button>
      )}
    </div>
  );
}
