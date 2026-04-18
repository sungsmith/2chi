# Step 6: nextjs-web-scaffold

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `packages/shared/src/index.ts`
- `tsconfig.base.json`
- `pnpm-workspace.yaml`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Next.js 14 App Router 웹 프로젝트를 세팅한다. shadcn/ui, Tailwind CSS, TanStack Query Provider까지 설정한다.

**생성할 파일:**
- `apps/web/package.json`
- `apps/web/next.config.js`
- `apps/web/tailwind.config.ts`
- `apps/web/postcss.config.js`
- `apps/web/tsconfig.json`
- `apps/web/vitest.config.ts`
- `apps/web/vitest.setup.ts`
- `apps/web/app/layout.tsx`
- `apps/web/app/globals.css`
- `apps/web/lib/utils.ts`
- `apps/web/components/providers.tsx`

### Step 1: package.json 생성

`apps/web/package.json`:
```json
{
  "name": "@2chi/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@2chi/shared": "workspace:*",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.35.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.51.0",
    "@hookform/resolvers": "^3.4.0",
    "zod": "^3.23.0",
    "ai": "^3.1.0",
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/node": "^20.12.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "vitest": "^1.5.0",
    "@testing-library/react": "^15.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@vitejs/plugin-react": "^4.2.0",
    "jsdom": "^24.0.0"
  }
}
```

### Step 2: next.config.js 생성

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@2chi/shared'],
};

module.exports = nextConfig;
```

### Step 3: tsconfig.json 생성

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@2chi/shared": ["../../packages/shared/src/index.ts"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Step 4: tailwind.config.ts 생성

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

### Step 5: postcss.config.js 생성

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Step 6: vitest.config.ts 생성

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '@2chi/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
```

`apps/web/vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

### Step 7: globals.css 생성

`apps/web/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply text-slate-700 bg-slate-50;
  }
}
```

### Step 8: lib/utils.ts 생성

`apps/web/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Step 9: providers.tsx 생성

`apps/web/components/providers.tsx`:
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60 * 1000, retry: 1 },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### Step 10: root layout.tsx 생성

`apps/web/app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: '이취 (2chi) — 취업 올인원',
  description: '이력 하나에서 자소서·경력기술서·포트폴리오·면접 준비까지',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Step 11: pnpm 설치

```bash
pnpm install
```

Expected: Next.js, Tailwind 등 설치됨.

### Step 12: shadcn/ui 초기화

```bash
cd apps/web && npx shadcn@latest init
```

프롬프트 응답:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Expected: `components/ui/` 폴더와 `components.json` 생성.

shadcn 컴포넌트 추가:
```bash
npx shadcn@latest add button input label textarea badge card
```

### Step 13: 빌드 확인

```bash
cd apps/web && pnpm build
```

Expected: 빌드 성공.

### Step 14: 커밋

```bash
git add apps/web/package.json apps/web/next.config.js apps/web/tailwind.config.ts apps/web/postcss.config.js apps/web/tsconfig.json apps/web/vitest.config.ts apps/web/vitest.setup.ts apps/web/app/layout.tsx apps/web/app/globals.css apps/web/lib/utils.ts apps/web/components/providers.tsx apps/web/components.json
git commit -m "chore(web): scaffold Next.js 14 project with Tailwind and shadcn/ui"
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
- packages/shared의 타입을 재정의하지 마라. 반드시 import해 사용하라
- 컴포넌트는 서버 컴포넌트가 기본이다. 인터랙션이 필요한 경우에만 'use client'를 추가하라
