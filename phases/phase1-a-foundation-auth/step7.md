# Step 7: api-client-auth-store

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/web/app/layout.tsx`
- `apps/web/components/providers.tsx`
- `apps/web/lib/utils.ts`
- `packages/shared/src/types/api.ts`
- `packages/shared/src/types/user.ts`
- `packages/shared/src/schemas/auth.schema.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

프론트엔드 API 클라이언트, 인증 스토어(Zustand persist), 인증 훅을 구현한다.

**CRITICAL:** API 클라이언트는 localStorage의 Zustand persist 데이터에서 accessToken을 읽어 Authorization 헤더에 자동으로 포함한다.

**생성할 파일:**
- `apps/web/lib/api.ts`
- `apps/web/store/auth.store.ts`
- `apps/web/hooks/use-auth.ts`
- `apps/web/lib/__tests__/api.test.ts`

### Step 1: 실패 테스트 작성

`apps/web/lib/__tests__/api.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api';

describe('api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('includes Authorization header when token exists', async () => {
    localStorage.setItem('2chi-auth', JSON.stringify({ state: { accessToken: 'test-token' } }));

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: {} }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await api.get('/test');

    const calledWith = mockFetch.mock.calls[0][1];
    expect(calledWith.headers['Authorization']).toBe('Bearer test-token');
  });

  it('omits Authorization header when no token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: {} }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await api.get('/test');

    const calledWith = mockFetch.mock.calls[0][1];
    expect(calledWith.headers['Authorization']).toBeUndefined();
  });
});
```

### Step 2: 테스트 실행 (실패 확인)

```bash
cd apps/web && pnpm test -- lib/__tests__/api.test.ts
```

Expected: `Cannot find module '../api'` — 실패.

### Step 3: api.ts 구현

`apps/web/lib/api.ts`:
```typescript
import type { ApiResponse } from '@2chi/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('2chi-auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return response.json();
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
```

### Step 4: 테스트 실행 (통과 확인)

```bash
cd apps/web && pnpm test -- lib/__tests__/api.test.ts
```

Expected: `2 passed`.

### Step 5: auth.store.ts 구현

`apps/web/store/auth.store.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  jobType: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
      isAuthenticated: () => !!get().accessToken,
    }),
    { name: '2chi-auth' },
  ),
);
```

### Step 6: use-auth.ts 훅 구현

`apps/web/hooks/use-auth.ts`:
```typescript
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { AuthTokensDto, LoginInput, RegisterInput } from '@2chi/shared';
import type { ApiResponse } from '@2chi/shared';

export function useLogin() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginInput) => api.post<AuthTokensDto>('/auth/login', data),
    onSuccess: (res) => {
      if (res.success) {
        setAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
        router.push('/');
      }
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterInput) => api.post<AuthTokensDto>('/auth/register', data),
    onSuccess: (res) => {
      if (res.success) {
        setAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
        router.push('/');
      }
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const router = useRouter();

  return () => {
    logout();
    router.push('/login');
  };
}
```

### Step 7: 커밋

```bash
git add apps/web/lib/api.ts apps/web/lib/__tests__ apps/web/store/auth.store.ts apps/web/hooks/use-auth.ts
git commit -m "feat(web): add API client, auth store, and auth hooks"
```

## Acceptance Criteria

```bash
cd apps/web && pnpm test -- lib/__tests__/api.test.ts
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
- packages/shared의 타입(AuthTokensDto, LoginInput 등)을 재정의하지 마라. 반드시 import해 사용하라
- Zustand 스토어의 persist key는 반드시 `'2chi-auth'`로 고정하라. api.ts에서 이 키를 사용해 토큰을 읽는다
