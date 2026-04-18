# 아키텍처

## 디렉토리 구조

```
이취/
├── apps/
│   ├── web/                        # Next.js 14 프론트엔드
│   │   ├── app/
│   │   │   ├── (auth)/             # 로그인, 회원가입 (비인증 레이아웃)
│   │   │   ├── (dashboard)/        # 대시보드 홈 (인증 레이아웃)
│   │   │   ├── experience/         # 내 이력 관리 (STAR)
│   │   │   ├── cover-letter/       # 자소서
│   │   │   ├── career-desc/        # 경력기술서
│   │   │   ├── portfolio/          # 포트폴리오
│   │   │   ├── applications/       # 지원 현황 + 캘린더
│   │   │   ├── interview/          # 면접 준비
│   │   │   └── company/            # 기업 분석
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui 기본 컴포넌트
│   │   │   ├── shared/             # 프로젝트 공통 컴포넌트
│   │   │   └── {feature}/          # 기능별 컴포넌트
│   │   ├── hooks/                  # 커스텀 React 훅
│   │   ├── lib/
│   │   │   ├── api.ts              # API 클라이언트 (fetch wrapper)
│   │   │   ├── auth.ts             # 인증 토큰 관리
│   │   │   └── utils.ts
│   │   └── store/                  # Zustand 스토어
│   │
│   └── api/                        # NestJS 백엔드
│       └── src/
│           ├── auth/               # JWT 인증
│           ├── users/
│           ├── experiences/        # 이력 (STAR)
│           ├── companies/          # 기업 분석
│           ├── job-postings/       # 채용공고 스크랩
│           ├── cover-letters/      # 자소서
│           ├── career-descriptions/
│           ├── portfolios/
│           ├── applications/       # 지원 현황
│           ├── interviews/         # 면접 준비
│           ├── calendar/
│           ├── ai/                 # OpenAI 통합
│           │   ├── ai.module.ts
│           │   ├── ai.service.ts
│           │   ├── prompts/        # 기능별 프롬프트
│           │   └── streaming/      # SSE 스트리밍
│           └── files/              # 파일 업로드·다운로드
│
├── packages/
│   └── shared/
│       ├── types/                  # 공통 TypeScript 타입
│       ├── dtos/                   # 요청/응답 DTO
│       └── schemas/                # Zod 유효성 스키마
│
├── scripts/
│   ├── execute.ts                  # Harness 실행기
│   └── hooks/                     # Claude Code 훅
│
├── phases/                         # Harness 태스크 파일
├── turbo.json
├── docker-compose.yml
└── package.json
```

---

## 패턴

### 컴포넌트 전략 (Next.js App Router)
- **서버 컴포넌트 기본**: 데이터 fetch, 정적 렌더링은 서버 컴포넌트
- **클라이언트 컴포넌트 예외**: `'use client'`는 인터랙션·훅·브라우저 API가 필요할 때만
- **AI 스트리밍**: Vercel AI SDK `useCompletion` / `useChat` 훅 사용
- **폼**: React Hook Form + Zod schema (packages/shared/schemas 공유)

### API 레이어 (NestJS)
- **모듈 단위 분리**: 각 도메인은 Module/Controller/Service/DTO 4파일 구성
- **Guard**: JwtAuthGuard를 전역 적용, `@Public()` 데코레이터로 공개 엔드포인트 표시
- **DTO 유효성**: class-validator + class-transformer (packages/shared/dtos 공유)
- **AI 작업**: BullModule 큐에 Job 등록 → Worker에서 비동기 처리

### 에러 처리
- API: NestJS ExceptionFilter에서 일관된 응답 형식으로 변환
- Frontend: TanStack Query의 onError + 전역 에러 바운더리

---

## 데이터 흐름

### 일반 CRUD
```
사용자 입력
  → Client Component (React Hook Form + Zod 유효성)
  → TanStack Query mutation
  → apps/web/lib/api.ts (fetch + JWT 헤더)
  → NestJS Controller (DTO 유효성)
  → NestJS Service (비즈니스 로직)
  → Prisma → PostgreSQL
  → { success: true, data } 응답
  → TanStack Query 캐시 갱신
  → UI 업데이트
```

### AI 스트리밍 (자소서 초안)
```
사용자 "초안 생성" 클릭
  → POST /cover-letters/:id/items/:itemId/draft
  → NestJS → Bull 큐에 Job 등록
  → AI Worker: Prisma에서 이력·기업 데이터 조합
  → OpenAI GPT-4o streaming request
  → SSE (Server-Sent Events)로 프론트에 실시간 전달
  → Vercel AI SDK useCompletion 훅이 토큰 수신
  → 완료 시 DB 저장 (CoverLetterItem.aiDraft)
```

### PDF 생성
```
사용자 PDF 다운로드 요청
  → GET /career-descriptions/:id/pdf
  → Handlebars 템플릿에 데이터 주입
  → Puppeteer HTML → PDF 변환
  → Cloudflare R2 업로드
  → Signed URL 반환 → 브라우저 다운로드
```

### PDF 파싱 (온보딩)
```
이력서 PDF 업로드
  → Multer → Cloudflare R2 저장
  → pdf-parse 텍스트 추출
  → GPT-4o-mini: Experience STAR 형태로 구조화
  → 사용자 확인·수정 후 DB 저장
```

---

## 상태 관리

| 상태 종류 | 도구 | 위치 |
|-----------|------|------|
| 서버 데이터 (이력, 자소서 등) | TanStack Query | 훅 캐시 |
| AI 스트리밍 텍스트 | Vercel AI SDK | 로컬 훅 상태 |
| 인증 토큰 | Zustand (persist) | localStorage |
| UI 상태 (모달, 탭 등) | useState / useReducer | 로컬 컴포넌트 |
| 전역 앱 상태 (사용자 정보) | Zustand | 메모리 |

---

## AI 모델 라우팅

| 작업 | 모델 | 이유 |
|------|------|------|
| 자소서 초안 생성 | GPT-4o | 고품질 한국어 글쓰기 |
| 자소서 피드백 | GPT-4o | 세밀한 분석 필요 |
| 경력기술서 초안 | GPT-4o | 고품질 |
| 면접 피드백 | GPT-4o | 심층 분석 |
| PDF 파싱·구조화 | GPT-4o-mini | 반복 작업, 비용 절감 |
| 기업 분석 요약 | GPT-4o-mini | 반복 작업 |
| 역량 태깅 | GPT-4o-mini | 단순 분류 |
| 예상 질문 생성 | GPT-4o-mini | 대량 생성 |

---

## 캐싱 전략

- **기업 분석 결과**: DB 캐싱 (`Company.analyzedAt` 확인, 24h 이내 재사용)
- **역량 태그 목록**: NestJS 메모리 캐시 (CacheModule, 1h TTL)
- **TanStack Query 기본 staleTime**: 5분
