'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { InterviewAnswerDto, InterviewQuestionType } from '@2chi/shared';

const QUESTION_TYPE_LABEL: Record<InterviewQuestionType, string> = {
  COMPETENCY: '역량',
  BEHAVIORAL: '행동',
  TECHNICAL: '기술',
  SITUATIONAL: '상황',
};

const QUESTION_TYPE_CLASS: Record<InterviewQuestionType, string> = {
  COMPETENCY: 'bg-blue-50 text-blue-700 hover:bg-blue-50',
  BEHAVIORAL: 'bg-green-50 text-green-700 hover:bg-green-50',
  TECHNICAL: 'bg-orange-50 text-orange-700 hover:bg-orange-50',
  SITUATIONAL: 'bg-purple-50 text-purple-700 hover:bg-purple-50',
};

interface QuestionItemProps {
  answer: InterviewAnswerDto;
  isSaving: boolean;
  isRequestingFeedback: boolean;
  onSave: (answerId: string, text: string) => void;
  onRequestFeedback: (answerId: string) => void;
}

export function QuestionItem({
  answer,
  isSaving,
  isRequestingFeedback,
  onSave,
  onRequestFeedback,
}: QuestionItemProps) {
  const [text, setText] = useState(answer.answer ?? '');

  const typeLabel = QUESTION_TYPE_LABEL[answer.questionType] ?? answer.questionType;
  const typeClass = QUESTION_TYPE_CLASS[answer.questionType] ?? 'bg-slate-100 text-slate-600';

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
      <div className="flex items-start gap-3">
        <Badge className={`shrink-0 text-xs font-medium rounded-full px-2.5 py-0.5 border-0 ${typeClass}`}>
          {typeLabel}
        </Badge>
        <p className="text-sm text-slate-800 leading-relaxed flex-1">{answer.question}</p>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="답변을 입력하세요..."
        className="resize-none text-sm text-slate-900 leading-relaxed min-h-[100px]"
        rows={4}
      />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onSave(answer.id, text)}
          disabled={isSaving || !text.trim()}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              저장 중...
            </>
          ) : (
            '저장'
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRequestFeedback(answer.id)}
          disabled={isRequestingFeedback || !answer.answer}
        >
          {isRequestingFeedback ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              피드백 생성 중...
            </>
          ) : (
            'AI 피드백'
          )}
        </Button>
      </div>

      {answer.aiFeedback && (
        <div className="rounded-md bg-slate-50 border border-slate-200 p-4 space-y-2">
          {answer.score !== null && (
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-slate-700">{answer.score}점</span>
            </div>
          )}
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {answer.aiFeedback}
          </p>
        </div>
      )}
    </div>
  );
}
