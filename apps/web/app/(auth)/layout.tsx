export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">이취</h1>
          <p className="text-sm text-slate-500 mt-1">이직과 취직을 한 번에</p>
        </div>
        {children}
      </div>
    </div>
  );
}
