# Step 0: monorepo-root-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Turborepo 기반 pnpm 모노레포 루트를 세팅한다.

**Goal:** pnpm + Turborepo 모노레포 루트 파일을 생성하고, Docker로 DB + Redis를 실행한다.

**생성할 파일:**
- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig.base.json`
- `.env.example`
- `.gitignore`
- `docker-compose.yml`

### Step 1: package.json 생성

```json
{
  "name": "2chi",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

### Step 2: pnpm-workspace.yaml 생성

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Step 3: turbo.json 생성

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {}
  }
}
```

### Step 4: tsconfig.base.json 생성

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler"
  }
}
```

### Step 5: .env.example 생성

```env
# Database
DATABASE_URL=postgresql://2chi:2chi_password@localhost:5432/2chi_db

# JWT
JWT_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-refresh-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# App
NEXT_PUBLIC_API_URL=http://localhost:3001
PORT=3001

# Redis
REDIS_URL=redis://localhost:6379
```

### Step 6: .env 파일 생성 (git 제외)

`.env.example`을 복사해서 `.env`를 만들고 실제 값으로 채운다.

```bash
cp .env.example .env
```

`.gitignore`를 생성한다:

```
.env
node_modules
dist
.next
*.log
```

### Step 7: pnpm 설치 확인

```bash
pnpm install
```

Expected: `Packages: +N` 출력 없이 `Already up to date` 또는 turbo만 설치됨.

### Step 8: Docker로 DB + Redis 실행

`docker-compose.yml`을 작성하고 실행한다:

```bash
docker-compose up -d db redis
```

Expected: `2chi-db`, `2chi-redis` 컨테이너가 healthy 상태.

```bash
docker-compose ps
```

Expected: db, redis 모두 `(healthy)`.

### Step 9: 커밋

```bash
git init
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .env.example .gitignore docker-compose.yml
git commit -m "chore: initialize monorepo root with Turborepo"
```

## Acceptance Criteria

```bash
pnpm install
docker-compose ps
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
- `.env`를 git에 커밋하지 마라
