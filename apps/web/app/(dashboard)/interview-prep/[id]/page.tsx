'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionItem } from '@/components/interview-prep/question-item';
import { GenerateQuestionsForm } from '@/components/interview-prep/generate-questions-form';
import {
  useInterviewPrep,
  useGenerateQuestions,
  useSaveAnswer,
  useRequestFeedback,
} from '@/hooks/use-interview-preps';
import type { GenerateQuestionsInput } from '@2chi/shared';

export default function InterviewPrepDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data: prep, isLoading } = useInterviewPrep(id);
  const generateQuestions = useGenerateQuestions(id);
  const saveAnswer = useSaveAnswer(id);
  const requestFeedback = useRequestFeedback(id);

  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [savingAnswerId, setSavingAnswerId] = useState<string | null>(null);
  const [feedbackAnswerId, setFeedbackAnswerId] = useState<string | null>(null);

  const handleGenerate = async (data: GenerateQuestionsInput) => {
    await generateQuestions.mutateAsync(data);
    setShowGenerateForm(false);
  };

  const handleSaveAnswer = async (answerId: string, text: string) => {
    setSavingAnswerId(answerId);
    try {
      await saveAnswer.mutateAsync({ answerId, answer: text });
    } finally {
      setSavingAnswerId(null);
    }
  };

  const handleRequestFeedback = async (answerId: string) => {
    setFeedbackAnswerId(answerId);
    try {
      await requestFeedback.mutateAsync(answerId);
    } finally {
      setFeedbackAnswerId(null);
    }
  };

  const scoredAnswers = prep?.answers?.filter((a) => a.score !== null) ?? [];
  const avgScore =
    scoredAnswers.length > 0
      ? Math.round(scoredAnswers.reduce((sum, a) => sum + (a.score ?? 0), 0) / scoredAnswers.length)
      : null;

  if (isLoading) {
    return (
      <div className="max-w-3xl flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!prep) {
    return (
      <div className="max-w-3xl">
        <p className="text-sm text-slate-500">면접 준비 세션을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const sortedAnswers = prep.answers
    ? [...prep.answers].sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-slate-700 px-2"
          onClick={() => router.push('/interview-prep')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          목록으로
        </Button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{prep.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-500">질문 {sortedAnswers.length}개</p>
            {avgScore !== null && (
              <p className="flex items-center gap-1 text-sm text-amber-600">
                <Star className="w-4 h-4" />
                평균 {avgScore}점
              </p>
            )}
          </div>
        </div>
        <Button
          className="flex items-center gap-2 shrink-0"
          onClick={() => setShowGenerateForm((v) => !v)}
          disabled={generateQuestions.isPending}
        >
          {generateQuestions.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              질문 생성 중...
            </>
          ) : (
            'AI 질문 생성'
          )}
        </Button>
      </div>

      {showGenerateForm && !generateQuestions.isPending && (
        <div className="mb-6 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">질문 생성 설정</h2>
          <GenerateQuestionsForm
            isPending={generateQuestions.isPending}
            onSubmit={handleGenerate}
            onCancel={() => setShowGenerateForm(false)}
          />
        </div>
      )}

      {generateQuestions.isPending && (
        <div className="mb-6 flex items-center gap-3 text-sm text-slate-500 bg-blue-50 border border-blue-100 rounded-md px-4 py-3">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          AI가 질문을 생성 중입니다. 잠시 후 목록이 업데이트됩니다.
        </div>
      )}

      {sortedAnswers.length === 0 && !generateQuestions.isPending && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">생성된 질문이 없습니다.</p>
          <p className="text-xs mt-1">위 "AI 질문 생성" 버튼을 눌러 질문을 생성하세요.</p>
        </div>
      )}

      <div className="space-y-4">
        {sortedAnswers.map((answer) => (
          <QuestionItem
            key={answer.id}
            answer={answer}
            isSaving={savingAnswerId === answer.id}
            isRequestingFeedback={feedbackAnswerId === answer.id}
            onSave={handleSaveAnswer}
            onRequestFeedback={handleRequestFeedback}
          />
        ))}
      </div>
    </div>
  );
}
