# Step 1: shared-package-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`packages/shared` 패키지를 세팅한다. 이 패키지는 프론트/백에서 공통으로 사용하는 TypeScript 타입, DTO, Zod 스키마를 담는다.

**생성할 파일:**
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/types/api.ts`
- `packages/shared/src/types/user.ts`
- `packages/shared/src/schemas/auth.schema.ts`

### Step 1: packages/shared/package.json 생성

```json
{
  "name": "@2chi/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc --noEmit",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

### Step 2: packages/shared/tsconfig.json 생성

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

### Step 3: 공통 API 응답 타입 생성

`packages/shared/src/types/api.ts`:
```typescript
export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: { code: string; message: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

### Step 4: 사용자 타입 생성

`packages/shared/src/types/user.ts`:
```typescript
export type JobType = 'NEW_GRAD' | 'MID_CAREER' | 'EXPERIENCED';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  jobType: JobType;
  targetField: string | null;
  createdAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  user: Pick<UserDto, 'id' | 'email' | 'name' | 'jobType'>;
}
```

### Step 5: 인증 Zod 스키마 생성

`packages/shared/src/schemas/auth.schema.ts`:
```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
  name: z.string().min(1, '이름을 입력하세요.').max(50),
  jobType: z.enum(['NEW_GRAD', 'MID_CAREER', 'EXPERIENCED']),
});

export const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

### Step 6: index.ts에서 전부 re-export

`packages/shared/src/index.ts`:
```typescript
export * from './types/api';
export * from './types/user';
export * from './schemas/auth.schema';
```

### Step 7: 타입 체크

```bash
cd packages/shared && pnpm build
```

Expected: 에러 없음.

### Step 8: 커밋

```bash
git add packages/shared
git commit -m "feat(shared): add common types and Zod schemas for auth"
```

## Acceptance Criteria

```bash
cd packages/shared && pnpm build
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
- 각 앱에서 타입을 재정의하지 마라. 반드시 packages/shared를 통해 공유하라
