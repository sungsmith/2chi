export default function DashboardPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">대시보드</h1>
      <p className="text-sm text-slate-500 mb-8">취업 준비 현황을 한눈에 확인하세요.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">내 이력</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">—</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">자소서</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">—</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">진행 중인 지원</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">—</p>
        </div>
      </div>
    </div>
  );
}
