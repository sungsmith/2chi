'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResumeUploadZone } from '@/components/onboarding/resume-upload-zone';
import { ParsedExperienceItem } from '@/components/onboarding/parsed-experience-item';
import { Button } from '@/components/ui/button';
import { useConfirmParsed } from '@/hooks/use-onboarding';
import type { OnboardingParseResultDto, ParsedExperience } from '@2chi/shared';

type Step = 1 | 2;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [parseResult, setParseResult] = useState<OnboardingParseResultDto | null>(null);
  const [experiences, setExperiences] = useState<ParsedExperience[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const confirm = useConfirmParsed();

  function handleParseSuccess(result: OnboardingParseResultDto) {
    setParseResult(result);
    setExperiences(result.experiences);
    setChecked(result.experiences.map(() => true));
    setStep(2);
  }

  function handleReset() {
    setStep(1);
    setParseResult(null);
    setExperiences([]);
    setChecked([]);
    setSuccessMessage(null);
    confirm.reset();
  }

  function handleCheckAll(allChecked: boolean) {
    setChecked(experiences.map(() => allChecked));
  }

  function handleExperienceChange(index: number, updated: ParsedExperience) {
    setExperiences((prev) => prev.map((e, i) => (i === index ? updated : e)));
  }

  function handleCheckChange(index: number, isChecked: boolean) {
    setChecked((prev) => prev.map((c, i) => (i === index ? isChecked : c)));
  }

  async function handleSave() {
    if (!parseResult) return;
    const selected = experiences.filter((_, i) => checked[i]);
    if (selected.length === 0) return;

    try {
      const result = await confirm.mutateAsync({
        parseId: parseResult.parseId,
        experiences: selected,
      });
      setSuccessMessage(`경험 ${result.createdCount}개가 저장되었습니다.`);
      setTimeout(() => router.push('/experience'), 1200);
    } catch {
      // error displayed via confirm.error
    }
  }

  const allChecked = checked.length > 0 && checked.every(Boolean);
  const selectedCount = checked.filter(Boolean).length;

  if (step === 1) {
    return (
      <div className="max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">이력서 가져오기</h1>
          <p className="text-sm text-slate-500 mt-0.5">기존 이력서를 업로드하면 AI가 STAR 구조로 자동 정리합니다.</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <ResumeUploadZone onSuccess={handleParseSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">파싱 결과 확인</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            총 {experiences.length}개의 경험을 발견했습니다.
            {parseResult && (
              <span className="ml-2 text-slate-400">
                AI 파싱 신뢰도: {Math.round(parseResult.confidence * 100)}%
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={handleReset} className="text-sm">
          다시 업로드
        </Button>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {confirm.error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {confirm.error.message}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          id="select-all"
          checked={allChecked}
          onChange={(e) => handleCheckAll(e.target.checked)}
          className="rounded border-slate-300 accent-blue-600"
        />
        <label htmlFor="select-all" className="text-sm text-slate-600 cursor-pointer select-none">
          전체 선택
        </label>
      </div>

      <div className="space-y-3 mb-6">
        {experiences.map((exp, i) => (
          <ParsedExperienceItem
            key={i}
            experience={exp}
            checked={checked[i] ?? false}
            onChange={(updated) => handleExperienceChange(i, updated)}
            onCheckChange={(isChecked) => handleCheckChange(i, isChecked)}
          />
        ))}
      </div>

      <Button
        onClick={handleSave}
        disabled={selectedCount === 0 || confirm.isPending || !!successMessage}
        className="w-full"
      >
        {confirm.isPending ? '저장 중...' : `선택 항목 저장 (${selectedCount}개)`}
      </Button>
    </div>
  );
}
