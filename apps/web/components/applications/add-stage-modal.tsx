'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAddStage, useCustomStageLabels } from '@/hooks/use-applications';
import { STAGE_LABELS, type ApplicationStage } from '@2chi/shared';

const STANDARD_STAGES: ApplicationStage[] = [
  'DOCUMENT',
  'FIRST_INTERVIEW',
  'SECOND_INTERVIEW',
  'OFFER',
];

const DATE_LABELS: Record<string, string> = {
  DOCUMENT: '마감일',
  FIRST_INTERVIEW: '면접일',
  SECOND_INTERVIEW: '면접일',
  OFFER: '통보일',
  DONE: '완료일',
  CUSTOM: '응시일',
};

const schema = z.object({
  scheduledAt: z.string().optional(),
  result: z.enum(['PASS', 'FAIL', 'PENDING', 'WITHDRAWN']).optional(),
  note: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  applicationId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddStageModal({ applicationId, onClose, onSuccess }: Props) {
  const addStage = useAddStage(applicationId);
  const { data: customLabels = [] } = useCustomStageLabels();

  // selectedValue: standard stage key or 'CUSTOM:라벨명'
  const [selectedValue, setSelectedValue] = useState<string>('FIRST_INTERVIEW');
  const [showNewInput, setShowNewInput] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const isCustomValue = selectedValue.startsWith('CUSTOM:');
  const customLabelFromValue = isCustomValue ? selectedValue.slice(7) : '';
  const effectiveStage: ApplicationStage = isCustomValue ? 'CUSTOM' : (selectedValue as ApplicationStage);
  const dateLabelText = DATE_LABELS[effectiveStage] ?? '날짜';

  async function onSubmit(values: FormValues) {
    const stage = effectiveStage;
    const customLabel = isCustomValue ? customLabelFromValue : undefined;
    await addStage.mutateAsync({
      stage,
      customLabel,
      scheduledAt: values.scheduledAt || undefined,
      result: values.result,
      note: values.note,
    });
    onSuccess?.();
    onClose();
  }

  function handleAddNewLabel() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    setSelectedValue(`CUSTOM:${trimmed}`);
    setShowNewInput(false);
    setNewLabel('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">전형 단계 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 전형 선택 */}
          <div className="space-y-2">
            <Label>전형 단계</Label>
            <div className="flex flex-wrap gap-2">
              {STANDARD_STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSelectedValue(s); setShowNewInput(false); }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedValue === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {STAGE_LABELS[s]}
                </button>
              ))}
              {customLabels.map((label) => (
                <button
                  key={`CUSTOM:${label}`}
                  type="button"
                  onClick={() => { setSelectedValue(`CUSTOM:${label}`); setShowNewInput(false); }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedValue === `CUSTOM:${label}`
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:text-purple-600'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowNewInput((v) => !v)}
                className="px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-500 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                전형 추가
              </button>
            </div>

            {showNewInput && (
              <div className="flex gap-2 mt-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="예: 코딩테스트, 사전과제"
                  maxLength={50}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewLabel(); } }}
                  autoFocus
                />
                <Button type="button" size="sm" onClick={handleAddNewLabel} disabled={!newLabel.trim()}>
                  추가
                </Button>
              </div>
            )}

            {isCustomValue && (
              <p className="text-xs text-purple-600">
                선택된 전형: <strong>{customLabelFromValue}</strong>
              </p>
            )}
          </div>

          {/* 날짜 */}
          <div className="space-y-1.5">
            <Label>
              {dateLabelText} <span className="text-slate-400 text-xs">(선택)</span>
            </Label>
            <Input type="date" {...register('scheduledAt')} />
          </div>

          {/* 결과 */}
          <div className="space-y-1.5">
            <Label>
              결과 <span className="text-slate-400 text-xs">(선택)</span>
            </Label>
            <select
              {...register('result')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">미결정</option>
              <option value="PASS">합격</option>
              <option value="FAIL">불합격</option>
              <option value="PENDING">대기</option>
              <option value="WITHDRAWN">포기</option>
            </select>
          </div>

          {/* 메모 */}
          <div className="space-y-1.5">
            <Label>
              메모 <span className="text-slate-400 text-xs">(선택)</span>
            </Label>
            <Input {...register('note')} placeholder="추가 메모" maxLength={500} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              추가
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
