'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { GenerateQuestionsInput, InterviewQuestionType } from '@2chi/shared';

const QUESTION_TYPES: { value: InterviewQuestionType; label: string }[] = [
  { value: 'COMPETENCY', label: '역량' },
  { value: 'BEHAVIORAL', label: '행동' },
  { value: 'TECHNICAL', label: '기술' },
  { value: 'SITUATIONAL', label: '상황' },
];

interface GenerateQuestionsFormProps {
  isPending: boolean;
  onSubmit: (data: GenerateQuestionsInput) => void;
  onCancel: () => void;
}

export function GenerateQuestionsForm({ isPending, onSubmit, onCancel }: GenerateQuestionsFormProps) {
  const [count, setCount] = useState(10);
  const [selectedTypes, setSelectedTypes] = useState<InterviewQuestionType[]>([
    'COMPETENCY',
    'BEHAVIORAL',
    'TECHNICAL',
    'SITUATIONAL',
  ]);

  const toggleType = (type: InterviewQuestionType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleSubmit = () => {
    const data: GenerateQuestionsInput = {
      count,
      questionTypes: selectedTypes.length < 4 ? selectedTypes : undefined,
    };
    onSubmit(data);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="count">질문 수 (3~20)</Label>
        <Input
          id="count"
          type="number"
          min={3}
          max={20}
          value={count}
          onChange={(e) => setCount(Math.min(20, Math.max(3, Number(e.target.value))))}
        />
      </div>

      <div className="space-y-2">
        <Label>질문 유형</Label>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleType(value)}
              className={`rounded-md text-xs font-medium px-3 py-1.5 border transition-colors ${
                selectedTypes.includes(value)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={isPending || selectedTypes.length === 0}
          className="flex-1"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              질문 생성 중...
            </>
          ) : (
            'AI 질문 생성'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}
