'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Briefcase,
  Calendar,
  LayoutDashboard,
  LogOut,
  Building2,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout } from '@/hooks/use-auth';

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/experience', label: '내 이력', icon: Briefcase },
  { href: '/cover-letter', label: '자소서', icon: FileText },
  { href: '/career-desc', label: '경력기술서', icon: ClipboardList },
  { href: '/company', label: '기업 분석', icon: Building2 },
  { href: '/applications', label: '지원 현황', icon: Calendar },
];

export function Sidebar() {
  const pathname = usePathname();
  const logout = useLogout();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 min-h-screen flex flex-col">
      <div className="px-4 py-5 border-b border-slate-200">
        <span className="text-lg font-semibold text-slate-900">이취</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === href
                ? 'text-slate-900 bg-slate-100 font-medium'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-slate-200">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
