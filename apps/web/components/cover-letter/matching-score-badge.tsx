'use client';

import { useMatchingScore } from '@/hooks/use-companies';
import { cn } from '@/lib/utils';

interface Props {
  coverLetterId: string;
  currentScore: number | null;
}

export function MatchingScoreBadge({ coverLetterId, currentScore }: Props) {
  const calculateScore = useMatchingScore(coverLetterId);

  const scoreColor =
    currentScore === null ? 'text-slate-400 bg-slate-100' :
    currentScore >= 70 ? 'text-green-700 bg-green-50' :
    currentScore >= 40 ? 'text-amber-700 bg-amber-50' : 'text-red-600 bg-red-50';

  return (
    <div className="flex items-center gap-2">
      {currentScore !== null && (
        <span className={cn('rounded-full text-xs font-medium px-2.5 py-0.5', scoreColor)}>
          매칭도 {currentScore}%
        </span>
      )}
      <button
        type="button"
        onClick={() => calculateScore.mutate()}
        disabled={calculateScore.isPending}
        className="text-xs text-blue-600 hover:underline disabled:text-slate-400"
      >
        {calculateScore.isPending ? '계산 중...' : currentScore === null ? '매칭도 계산' : '재계산'}
      </button>
    </div>
  );
}
