# 프로젝트: 이취 (2chi)

> 이직과 취직을 한 번에. STAR 구조 이력 하나에서 자소서·경력기술서·포트폴리오·면접 준비까지 자동 생성하는 취업 올인원 웹 서비스.

---

## 기술 스택

### Monorepo
- **패키지 매니저**: pnpm
- **빌드 시스템**: Turborepo
- **언어**: TypeScript (strict mode, 전체)

### Frontend — `apps/web`
- Next.js 14 (App Router)
- shadcn/ui + Tailwind CSS
- Zustand (클라이언트 상태)
- TanStack Query (서버 상태)
- React Hook Form + Zod
- Vercel AI SDK (SSE 스트리밍)

### Backend — `apps/api`
- NestJS
- Prisma + PostgreSQL
- JWT (access 15m / refresh 7d)
- OpenAI SDK (GPT-4o / GPT-4o-mini)
- Bull (비동기 AI 큐)
- Multer → Cloudflare R2

### Shared — `packages/shared`
- 공통 TypeScript 타입, DTO, Zod 스키마

---

## 아키텍처 규칙

- **CRITICAL**: `packages/shared`의 타입·DTO·Zod 스키마를 프론트/백 양쪽에서 반드시 공유해야 한다. 각 앱에서 독자적으로 타입을 재정의하지 마라.
- **CRITICAL**: 모든 API 응답은 `{ success: true, data: T }` / `{ success: false, error: { code: string, message: string } }` 형식을 따라야 한다.
- **CRITICAL**: 인증이 필요한 모든 API는 `Authorization: Bearer <token>` 헤더를 사용한다. auth 엔드포인트(/auth/*)는 제외.
- **CRITICAL**: AI 작업(자소서 초안, 피드백 등)은 반드시 Bull 큐를 통해 비동기로 처리한다. 요청 스레드를 블로킹하지 마라.
- **CRITICAL**: 구현을 담당한 에이전트는 자신이 작성한 코드를 검증하지 않는다. 검증은 반드시 구현에 참여하지 않은 별도의 에이전트(코드 리뷰어 서브에이전트)가 수행한다.
- GPT-4o는 고품질 작업(자소서 초안, 피드백, 면접 피드백)에만 사용. 반복 작업(파싱, 태깅, 질문 생성, 기업 분석)은 GPT-4o-mini 사용.
- DB 쿼리는 모두 Prisma를 통해서만 한다. Raw SQL 금지.
- 환경 변수는 `.env.example`에 반드시 문서화한다. 
- 파일 업로드: PDF(.pdf)와 Word(.docx)를 지원한다. HWP 미지원. PDF는 pdf-parse, Word는 mammoth 라이브러리로 텍스트 추출.

---

## 개발 프로세스

- **CRITICAL**: 구현 전 반드시 플랜 모드로 플랜을 작성하고, 사용자 승인을 받은 후 구현을 시작한다.
  - 플랜 작성: `superpowers:writing-plans` 스킬 사용
  - 플랜 실행: `superpowers:executing-plans` 스킬 사용
- **CRITICAL**: TDD — 구현 파일보다 테스트 파일을 먼저 작성한다. 테스트가 통과하는 최소 구현을 작성한다.
- **CRITICAL**: 각 플랜의 구현 완료 후 반드시 코드 리뷰어 서브에이전트로 검증한다. 구현을 담당한 에이전트는 자신의 코드를 직접 검증하지 않는다.
- 커밋 메시지는 Conventional Commits 형식을 따른다 (`feat:`, `fix:`, `chore:`, `test:`, `docs:` 등).
- PR 전 `pnpm lint && pnpm test`가 통과해야 한다.

---

## 서브에이전트

복잡한 작업은 아래 서브에이전트에게 위임하라. 각 에이전트는 해당 도메인의 시니어 전문가처럼 작동한다.

| # | 역할 | 위임 조건 | 상세 |
|---|------|-----------|------|
| 1 | 프론트엔드 시니어 개발자 | `apps/web` 컴포넌트·페이지·훅, AI 스트리밍 UI, 폼 구현 | [docs/agents/01-frontend.md](docs/agents/01-frontend.md) |
| 2 | 백엔드 시니어 개발자 | `apps/api` 모듈, API 엔드포인트, DB 스키마, AI 큐 | [docs/agents/02-backend.md](docs/agents/02-backend.md) |
| 3 | 프로 디자이너 | 새 페이지 디자인, 컴포넌트 비주얼, 디자인 시스템 | [docs/agents/03-designer.md](docs/agents/03-designer.md) |
| 4 | 코드 리뷰어 | 기능 구현 완료 후, PR 전, 버그 수정 후 | [docs/agents/04-code-reviewer.md](docs/agents/04-code-reviewer.md) |
| 5 | QA 전문가 | 테스트 코드 작성, 버그 재현, 커버리지 점검 | [docs/agents/05-qa.md](docs/agents/05-qa.md) |

---

## 명령어

→ [order/order.md](order/order.md) 참조

---

## 환경 변수

`.env.example`을 복사해 `.env`를 만들고 실제 값을 채운다 (`cp .env.example .env`). `.env`는 git에 커밋하지 않는다.

핵심 변수:
- `DATABASE_URL` — PostgreSQL 연결 문자열
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — 프로덕션에서 충분히 복잡한 값으로 교체
- `OPENAI_API_KEY` — https://platform.openai.com/api-keys 에서 발급. **AI 기능 전체의 필수 키.**
- `REDIS_URL` — Bull 큐용 Redis 연결 문자열
- `R2_*` — Cloudflare R2 스토리지 (Phase 2 파일 업로드부터 필요, **자동 세팅 불가 — 수동 발급 필요**. [설정 방법 →](docs/PROD.md))
- `NEXT_PUBLIC_API_URL` — 프론트에서 API 호출 주소 (로컬: `http://localhost:3001`)

## 모델 선택

| 작업 | 모델 |
|------|------|
| 설계, 복잡한 구현, 플랜 작성, 코드 리뷰 | **Claude Sonnet 4.6** (`claude-sonnet-4-6`) |
| 일반 구현, 파일 작성, 단순 편집 | **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) |

Claude Code에서 모델을 전환하려면 `/model` 명령을 사용한다.

## 코드 컨벤션

모든 코드에 아래 규칙을 적용한다. 새 규칙은 **이 섹션**에 추가한다.

### 서식
- 들여쓰기는 스페이스 2칸 사용한다.

### 추가 규칙
- 함수명은 camelCase 사용
- 컴포넌트명은 PascalCase 사용
- 상수명은 UPPER_SNAKE_CASE 사용
