interface Props {
  competencies: string[];
  title?: string;
}

export function CompetencyList({ competencies, title = '핵심 역량' }: Props) {
  if (!competencies.length) return null;

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {competencies.map((c, i) => (
          <span key={i} className="rounded-md bg-blue-50 text-blue-700 text-sm px-3 py-1">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
