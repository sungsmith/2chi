import { MessageSquare, Star } from 'lucide-react';
import type { InterviewPrepDto } from '@2chi/shared';

interface InterviewPrepCardProps {
  interviewPrep: InterviewPrepDto;
  onClick: () => void;
  onDelete: () => void;
}

export function InterviewPrepCard({ interviewPrep, onClick, onDelete }: InterviewPrepCardProps) {
  const questionCount = interviewPrep.answers?.length ?? 0;
  const scoredAnswers = interviewPrep.answers?.filter((a) => a.score !== null) ?? [];
  const avgScore =
    scoredAnswers.length > 0
      ? Math.round(scoredAnswers.reduce((sum, a) => sum + (a.score ?? 0), 0) / scoredAnswers.length)
      : null;

  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-shadow cursor-pointer group relative"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900 truncate">
              {interviewPrep.title}
            </h3>
            {interviewPrep.jobPostingId && (
              <span className="inline-block rounded-full text-xs font-medium px-2.5 py-0.5 bg-blue-50 text-blue-700">
                공고 연결됨
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-500">질문 {questionCount}개</span>
            {avgScore !== null && (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <Star className="w-3 h-3" />
                평균 {avgScore}점
              </span>
            )}
            <span className="text-xs text-slate-400">
              {new Date(interviewPrep.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
        aria-label="삭제"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </button>
    </div>
  );
}
