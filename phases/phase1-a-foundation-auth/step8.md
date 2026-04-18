# Step 8: auth-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/web/hooks/use-auth.ts`
- `apps/web/store/auth.store.ts`
- `apps/web/lib/api.ts`
- `packages/shared/src/schemas/auth.schema.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

로그인·회원가입 페이지와 Auth 레이아웃을 구현한다.

**생성할 파일:**
- `apps/web/app/(auth)/layout.tsx`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/register/page.tsx`
- `apps/web/app/(auth)/login/__tests__/page.test.tsx`

### Step 1: 실패 테스트 작성

`apps/web/app/(auth)/login/__tests__/page.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../page';

vi.mock('@/hooks/use-auth', () => ({
  useLogin: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: ({ mutationFn }: any) => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
  });

  it('renders login button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('shows link to register page', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: /회원가입/ })).toBeInTheDocument();
  });
});
```

### Step 2: 테스트 실행 (실패 확인)

```bash
cd apps/web && pnpm test -- "app/\(auth\)/login"
```

Expected: `Cannot find module '../page'` — 실패.

### Step 3: Auth 레이아웃 구현

`apps/web/app/(auth)/layout.tsx`:
```typescript
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
```

### Step 4: 로그인 페이지 구현

`apps/web/app/(auth)/login/page.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/use-auth';
import { loginSchema, type LoginInput } from '@2chi/shared';

export default function LoginPage() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginInput) => login.mutate(data);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-6">로그인</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>
        {!login.isSuccess && login.data && !login.data.success && (
          <p className="text-xs text-red-500">{login.data.error.message}</p>
        )}
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? '로그인 중...' : '로그인'}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-500">
        계정이 없으신가요?{' '}
        <Link href="/register" className="text-blue-600 hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
```

### Step 5: 회원가입 페이지 구현

`apps/web/app/(auth)/register/page.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegister } from '@/hooks/use-auth';
import { registerSchema, type RegisterInput } from '@2chi/shared';

export default function RegisterPage() {
  const register_ = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = (data: RegisterInput) => register_.mutate(data);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-6">회원가입</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">이름</Label>
          <Input id="name" placeholder="홍길동" {...register('name')} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">비밀번호</Label>
          <Input id="password" type="password" placeholder="8자 이상" {...register('password')} />
          {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jobType">지원 유형</Label>
          <select
            id="jobType"
            {...register('jobType')}
            className="w-full rounded-md bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="NEW_GRAD">신입</option>
            <option value="MID_CAREER">중고신입 (1~5년)</option>
            <option value="EXPERIENCED">경력</option>
          </select>
          {errors.jobType && <p className="text-xs text-red-500">{errors.jobType.message}</p>}
        </div>
        {register_.data && !register_.data.success && (
          <p className="text-xs text-red-500">{register_.data.error.message}</p>
        )}
        <Button type="submit" className="w-full" disabled={register_.isPending}>
          {register_.isPending ? '가입 중...' : '회원가입'}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-500">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
```

### Step 6: 테스트 실행 (통과 확인)

```bash
cd apps/web && pnpm test -- "app/\(auth\)/login"
```

Expected: `3 passed`.

### Step 7: 커밋

```bash
git add "apps/web/app/(auth)"
git commit -m "feat(web): add login and register pages"
```

## Acceptance Criteria

```bash
cd apps/web && pnpm test -- "app/\(auth\)/login"
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
- packages/shared의 loginSchema, registerSchema를 직접 재정의하지 마라. 반드시 import해 사용하라
- 'use client' 없이 React Hook Form을 사용하지 마라
