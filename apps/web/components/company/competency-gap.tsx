import Link from 'next/link';
import type { CompetencyGapDto } from '@2chi/shared';

interface Props {
  gap: CompetencyGapDto;
}

export function CompetencyGap({ gap }: Props) {
  const scoreColor =
    gap.score >= 70 ? 'bg-green-500' : gap.score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const scoreLabel =
    gap.score >= 70 ? '우수' : gap.score >= 40 ? '보통' : '부족';

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">매칭도</p>
          <span className="text-sm font-semibold text-slate-900">
            {gap.score}점 <span className="text-slate-400 font-normal">/ 100</span>
            <span className="ml-2 text-xs text-slate-500">{scoreLabel}</span>
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100">
          <div
            className={`h-2 rounded-full transition-all ${scoreColor}`}
            style={{ width: `${gap.score}%` }}
          />
        </div>
        {gap.summary && (
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">{gap.summary}</p>
        )}
      </div>

      {gap.myMatched.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            보유 역량
          </p>
          <div className="flex flex-wrap gap-2">
            {gap.myMatched.map((c, i) => (
              <span
                key={i}
                className="rounded-md bg-green-50 text-green-700 text-xs px-2.5 py-1 font-medium"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {gap.myMissing.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            부족한 역량
          </p>
          <div className="flex flex-wrap gap-2">
            {gap.myMissing.map((c, i) => (
              <span
                key={i}
                className="rounded-md bg-red-50 text-red-600 text-xs px-2.5 py-1 font-medium"
              >
                {c}
              </span>
            ))}
          </div>
          <div className="mt-3">
            <Link
              href="/experience"
              className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              이 역량 보완하기 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
