# Step 9: dashboard-layout-guard

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/web/hooks/use-auth.ts`
- `apps/web/store/auth.store.ts`
- `apps/web/lib/utils.ts`
- `apps/web/app/(auth)/layout.tsx`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

대시보드 레이아웃과 인증 보호 미들웨어를 구현한다. 미인증 사용자가 보호된 경로에 접근하면 /login으로 리다이렉트된다.

**생성할 파일:**
- `apps/web/app/(dashboard)/layout.tsx`
- `apps/web/app/(dashboard)/page.tsx`
- `apps/web/components/shared/sidebar.tsx`
- `apps/web/middleware.ts`

**수정할 파일:**
- `apps/web/hooks/use-auth.ts` (쿠키 설정 추가)

### Step 1: middleware.ts 구현 (인증 보호)

`apps/web/middleware.ts`:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const authCookie = request.cookies.get('2chi-auth');

  if (!isPublic && !authCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

**참고**: Zustand persist는 localStorage 기반이라 서버사이드 미들웨어에서 직접 읽기 어렵다. 로그인 성공 시 쿠키도 함께 설정하도록 `use-auth.ts`를 수정한다:

`apps/web/hooks/use-auth.ts`의 `useLogin` onSuccess 내부에서 추가:
```typescript
if (res.success) {
  setAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
  document.cookie = `2chi-auth=1; path=/; max-age=${7 * 24 * 3600}`;
  router.push('/');
}
```

`useRegister` onSuccess에도 동일하게 쿠키 설정 추가.

`useLogout` 함수에서 쿠키 삭제:
```typescript
return () => {
  logout();
  document.cookie = '2chi-auth=; path=/; max-age=0';
  router.push('/login');
};
```

### Step 2: Sidebar 구현

`apps/web/components/shared/sidebar.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Briefcase,
  Calendar,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout } from '@/hooks/use-auth';

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/experience', label: '내 이력', icon: Briefcase },
  { href: '/cover-letter', label: '자소서', icon: FileText },
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
```

### Step 3: Dashboard 레이아웃 구현

`apps/web/app/(dashboard)/layout.tsx`:
```typescript
import { Sidebar } from '@/components/shared/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-6 py-6 min-w-0">{children}</main>
    </div>
  );
}
```

### Step 4: 홈 페이지 구현

`apps/web/app/(dashboard)/page.tsx`:
```typescript
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
```

### Step 5: 개발 서버로 전체 플로우 확인

```bash
# 터미널 1
docker-compose up -d db redis

# 터미널 2
cd apps/api && pnpm dev

# 터미널 3
cd apps/web && pnpm dev
```

브라우저에서 확인:
1. `http://localhost:3000` → 미로그인 → `/login` 리다이렉트
2. 회원가입 → 대시보드 이동
3. 로그아웃 → `/login` 이동

### Step 6: 커밋

```bash
git add "apps/web/app/(dashboard)" apps/web/components/shared/sidebar.tsx apps/web/middleware.ts apps/web/hooks/use-auth.ts
git commit -m "feat(web): add authenticated dashboard layout with sidebar and routing guard"
```

## Acceptance Criteria

```bash
cd apps/web && pnpm build
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/phase1-a-foundation-auth/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- 미들웨어에서 localStorage를 직접 읽지 마라. 미들웨어는 서버사이드 실행이므로 쿠키만 사용 가능하다
