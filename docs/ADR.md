# Architecture Decision Records

## 철학

**이력 하나로 모든 산출물을 뽑는다**는 핵심 가치를 지킨다. 기술 선택은 MVP 배포 속도와 AI 연동 품질을 최우선으로 한다. 과도한 추상화보다 작동하는 최소 구현을 선택한다.

---

### ADR-001: Monorepo (Turborepo + pnpm)

**결정**: 프론트(apps/web), 백(apps/api), 공유 패키지(packages/shared)를 단일 레포로 관리.

**이유**: 프론트·백이 동일한 타입·DTO·Zod 스키마를 공유해야 한다. 별도 레포로 분리하면 타입 불일치가 런타임 버그로 이어진다. Turborepo의 태스크 캐싱으로 빌드 속도를 확보한다.

**트레이드오프**: 레포 규모가 커질수록 clone·install이 느려짐. 팀이 확장되면 독립 배포 전략이 복잡해질 수 있음.

---

### ADR-002: Next.js 14 App Router (Frontend)

**결정**: Pages Router 대신 App Router 사용.

**이유**: 서버 컴포넌트로 데이터 fetch를 서버에서 처리 → 초기 로드 빠름. AI 스트리밍은 Route Handler + SSE로 처리 가능. Vercel 배포와 궁합이 좋음.

**트레이드오프**: App Router는 아직 일부 생태계 라이브러리가 미지원. 서버/클라이언트 컴포넌트 경계를 개발자가 명시적으로 관리해야 함.

---

### ADR-003: NestJS (Backend)

**결정**: Express 대신 NestJS.

**이유**: 모듈/컨트롤러/서비스 구조로 도메인 경계가 명확해짐. class-validator + class-transformer로 DTO 유효성이 자동화됨. Bull, Prisma, OpenAI SDK 등 주요 라이브러리와 통합 모듈이 풍부함.

**트레이드오프**: 보일러플레이트가 Express보다 많음. 소규모 API에는 오버엔지니어링일 수 있음.

---

### ADR-004: Prisma + PostgreSQL

**결정**: ORM은 Prisma, DB는 PostgreSQL (Supabase 호스팅).

**이유**: TypeScript 타입 자동 생성으로 런타임 DB 에러를 컴파일 시점에 잡음. 스키마 변경 이력이 마이그레이션 파일로 관리됨. Supabase는 무료 티어로 MVP 비용 절감.

**트레이드오프**: 복잡한 쿼리(집계, 서브쿼리)에서 Prisma 한계가 있음 → 필요 시 `$queryRaw` 허용하되 DTO 유효성은 직접 검증.

---

### ADR-005: Bull (비동기 AI 작업 큐)

**결정**: AI 작업(자소서 초안, 피드백 등)은 Bull 큐로 비동기 처리.

**이유**: GPT-4o 응답은 10~30초 걸릴 수 있음. 동기 처리 시 HTTP 타임아웃 발생. Bull로 큐에 넣으면 요청 스레드 블로킹 없이 결과를 SSE/폴링으로 전달 가능.

**트레이드오프**: Redis 의존성 추가. 로컬 개발 시 Redis 실행 필요 (Docker로 해결).

---

### ADR-006: OpenAI GPT-4o / GPT-4o-mini 이중 모델

**결정**: 고품질 작업은 GPT-4o, 반복·파싱 작업은 GPT-4o-mini.

**이유**: GPT-4o-mini는 GPT-4o 대비 ~90% 저렴. 파싱·태깅 등 반복 작업에 GPT-4o 쓰면 비용 폭발. 자소서·피드백 등 사용자가 직접 읽는 산출물은 GPT-4o 품질 필요.

**트레이드오프**: 모델 선택 로직 유지 비용. GPT-4o-mini 품질이 충분치 않은 경우 GPT-4o로 업그레이드 필요.

---

### ADR-007: Cloudflare R2 (파일 스토리지)

**결정**: AWS S3 대신 Cloudflare R2.

**이유**: Egress 비용 0원. S3 API 호환으로 SDK 교체 없이 마이그레이션 가능. PDF 업로드·다운로드가 잦은 서비스에서 비용 구조가 유리.

**트레이드오프**: AWS 생태계(Lambda, CloudFront 등)와 통합이 S3 대비 복잡.

---

### ADR-008: Docker (개발·배포 환경)

**결정**: 모든 서비스(api, web, db, redis)를 Docker Compose로 묶어 실행.

**이유**: "내 로컬에서는 됐는데" 문제 제거. PostgreSQL + Redis를 로컬에 직접 설치하지 않아도 됨. Railway 배포 시 Dockerfile 재사용 가능.

**트레이드오프**: 개발 시 컨테이너 재빌드 시간 발생. Hot reload 설정이 기본 Node 대비 복잡.

---

### ADR-009: JWT (Access + Refresh Token)

**결정**: 세션 쿠키 대신 JWT. Access Token 15분, Refresh Token 7일.

**이유**: Next.js 프론트 + NestJS 백 분리 구조에서 CORS·쿠키 설정 복잡도 줄임. 모바일 확장 시에도 동일 인증 방식 재사용 가능.

**트레이드오프**: Access Token 탈취 시 15분 동안 유효. Refresh Token 블랙리스트 관리를 위해 Redis 필요.
