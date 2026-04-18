# 이취 (2chi) — 프로젝트 스펙 문서

> 이직과 취직을 한 번에. STAR 구조로 정리한 내 이력 하나에서 자소서·경력기술서·포트폴리오·면접 준비까지 전부 뽑아내는 취업 올인원 웹 서비스.

---

## 1. 프로젝트 개요

- **서비스명**: 이취 (2chi)
- **타겟**: 신입 취준생, 중고신입(경력 1~5년 이직자)
- **핵심 가치**: 하나의 이력 데이터 → 모든 취업 산출물 (자소서, 경력기술서, 포트폴리오) 자동 생성
- **AI**: OpenAI GPT-4o (고품질 작업) + GPT-4o-mini (파싱·태깅 등 반복 작업)

---

## 2. 기술 스택

### 아키텍처
- **Monorepo**: Turborepo
- **언어**: TypeScript (전체)

### Frontend — `apps/web`
- **Framework**: Next.js 14 (App Router)
- **UI Library**: shadcn/ui + Tailwind CSS
- **상태관리**: Zustand
- **서버 상태**: TanStack Query (React Query)
- **폼**: React Hook Form + Zod
- **AI 스트리밍**: Vercel AI SDK (SSE)
- **PDF 뷰어**: react-pdf

### Backend — `apps/api`
- **Framework**: NestJS
- **ORM**: Prisma
- **DB**: PostgreSQL
- **인증**: JWT (access token + refresh token)
- **파일 업로드**: Multer → Cloudflare R2 (or AWS S3)
- **PDF 텍스트 추출**: pdf-parse
- **PDF 생성**: Puppeteer
- **AI**: OpenAI Node.js SDK
- **큐**: Bull (비동기 AI 작업)
- **유효성 검사**: class-validator, class-transformer

### Shared — `packages/shared`
- 공통 TypeScript 타입, DTO, Zod 스키마

### 인프라
- **프론트 배포**: Vercel
- **백엔드 배포**: Railway
- **DB**: Supabase (PostgreSQL)
- **파일 스토리지**: Cloudflare R2

---

## 3. 레포 구조

```
이취/
├── apps/
│   ├── web/                    # Next.js 프론트엔드
│   │   ├── app/
│   │   │   ├── (auth)/         # 로그인, 회원가입
│   │   │   ├── (dashboard)/    # 대시보드 홈
│   │   │   ├── experience/     # 내 이력 관리
│   │   │   ├── cover-letter/   # 자소서
│   │   │   ├── career-desc/    # 경력기술서
│   │   │   ├── portfolio/      # 포트폴리오
│   │   │   ├── applications/   # 지원 현황 + 캘린더
│   │   │   ├── interview/      # 면접 준비
│   │   │   └── company/        # 기업 분석
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   │
│   └── api/                    # NestJS 백엔드
│       └── src/
│           ├── auth/
│           ├── users/
│           ├── experiences/
│           ├── companies/
│           ├── job-postings/
│           ├── cover-letters/
│           ├── career-descriptions/
│           ├── portfolios/
│           ├── applications/
│           ├── interviews/
│           ├── calendar/
│           ├── ai/             # OpenAI 통합 모듈
│           └── files/          # 파일 업로드·다운로드
│
├── packages/
│   └── shared/
│       ├── types/
│       ├── dtos/
│       └── schemas/            # Zod 스키마
│
├── turbo.json
├── package.json
└── .env.example
```

---

## 4. 데이터베이스 스키마 (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String
  name        String
  jobType     JobType  @default(NEW_GRAD)  // NEW_GRAD | MID_CAREER | EXPERIENCED
  targetField String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  experiences          Experience[]
  coverLetters         CoverLetter[]
  careerDescriptions   CareerDescription[]
  portfolios           Portfolio[]
  applications         Application[]
  interviewPreps       InterviewPrep[]
  calendarEvents       CalendarEvent[]
  resumeProfiles       ResumeProfile[]
  companies            Company[]
  jobPostings          JobPosting[]
}

enum JobType {
  NEW_GRAD
  MID_CAREER
  EXPERIENCED
}

model Experience {
  id            String    @id @default(cuid())
  userId        String
  title         String
  type          ExperienceType  // WORK | PROJECT | ACTIVITY | EDUCATION
  companyName   String?
  startDate     DateTime?
  endDate       DateTime?
  isCurrent     Boolean   @default(false)

  // STAR 구조
  situation     String?   @db.Text
  task          String?   @db.Text
  action        String?   @db.Text
  result        String?   @db.Text
  resultMetric  String?   // 수치 결과 (예: "전환율 23% 향상")

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user                     User                      @relation(fields: [userId], references: [id])
  tags                     ExperienceTag[]
  coverLetterItemRefs      CoverLetterItemExperience[]
  careerDescSections       CareerDescriptionSection[]
  portfolioSections        PortfolioSection[]
  interviewAnswers         InterviewAnswer[]
}

enum ExperienceType {
  WORK
  PROJECT
  ACTIVITY
  EDUCATION
}

model Tag {
  id          String          @id @default(cuid())
  name        String          @unique
  category    String?
  experiences ExperienceTag[]
}

model ExperienceTag {
  experienceId  String
  tagId         String
  experience    Experience @relation(fields: [experienceId], references: [id])
  tag           Tag        @relation(fields: [tagId], references: [id])
  @@id([experienceId, tagId])
}

model Company {
  id                String    @id @default(cuid())
  userId            String
  name              String
  industry          String?
  officialInfo      Json?     // 채용공고·IR 파싱 결과
  unofficialInfo    Json?     // 뉴스·리뷰 등 참고 정보
  keyCompetencies   String[]  // 필요 역량 리스트
  analyzedAt        DateTime?
  createdAt         DateTime  @default(now())

  user        User         @relation(fields: [userId], references: [id])
  jobPostings JobPosting[]
  coverLetters CoverLetter[]
  applications Application[]
}

model JobPosting {
  id                    String    @id @default(cuid())
  userId                String
  companyId             String?
  url                   String?
  title                 String
  department            String?
  deadline              DateTime?
  requiredCompetencies  String[]
  preferredCompetencies String[]
  requirements          String?   @db.Text
  rawText               String?   @db.Text
  parsedAt              DateTime?
  createdAt             DateTime  @default(now())

  user         User          @relation(fields: [userId], references: [id])
  company      Company?      @relation(fields: [companyId], references: [id])
  coverLetters CoverLetter[]
  applications Application[]
  interviewPreps InterviewPrep[]
}

model CoverLetter {
  id             String            @id @default(cuid())
  userId         String
  jobPostingId   String?
  companyId      String?
  title          String
  matchingScore  Int?              // 매칭도 0~100
  status         CoverLetterStatus @default(DRAFT)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  user       User               @relation(fields: [userId], references: [id])
  jobPosting JobPosting?        @relation(fields: [jobPostingId], references: [id])
  company    Company?           @relation(fields: [companyId], references: [id])
  items      CoverLetterItem[]
  applications Application[]
}

enum CoverLetterStatus {
  DRAFT
  EDITING
  DONE
}

model CoverLetterItem {
  id            String   @id @default(cuid())
  coverLetterId String
  question      String   @db.Text
  order         Int
  charLimit     Int?
  aiDraft       String?  @db.Text
  userContent   String?  @db.Text
  feedback      Json?    // { score, awkward_phrases, suggestions, missing_keywords }
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  coverLetter  CoverLetter               @relation(fields: [coverLetterId], references: [id])
  experiences  CoverLetterItemExperience[]
}

model CoverLetterItemExperience {
  coverLetterItemId String
  experienceId      String
  coverLetterItem   CoverLetterItem @relation(fields: [coverLetterItemId], references: [id])
  experience        Experience      @relation(fields: [experienceId], references: [id])
  @@id([coverLetterItemId, experienceId])
}

model CareerDescription {
  id            String   @id @default(cuid())
  userId        String
  title         String
  versionLabel  String?
  targetJobType String?
  pdfUrl        String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user     User                       @relation(fields: [userId], references: [id])
  sections CareerDescriptionSection[]
  applications Application[]
}

model CareerDescriptionSection {
  id                  String    @id @default(cuid())
  careerDescriptionId String
  experienceId        String?
  sectionType         String    // summary | project | skills | education
  order               Int
  content             Json

  careerDescription CareerDescription @relation(fields: [careerDescriptionId], references: [id])
  experience        Experience?        @relation(fields: [experienceId], references: [id])
}

model Portfolio {
  id           String   @id @default(cuid())
  userId       String
  title        String
  templateId   String?
  versionLabel String?
  pdfUrl       String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user     User               @relation(fields: [userId], references: [id])
  sections PortfolioSection[]
}

model PortfolioSection {
  id           String  @id @default(cuid())
  portfolioId  String
  experienceId String?
  sectionType  String
  order        Int
  content      Json

  portfolio  Portfolio  @relation(fields: [portfolioId], references: [id])
  experience Experience? @relation(fields: [experienceId], references: [id])
}

model Application {
  id                  String            @id @default(cuid())
  userId              String
  jobPostingId        String?
  companyId           String?
  coverLetterId       String?
  careerDescriptionId String?
  appliedAt           DateTime?
  currentStage        ApplicationStage  @default(DOCUMENT)
  result              ApplicationResult?
  memo                String?           @db.Text
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  user              User               @relation(fields: [userId], references: [id])
  jobPosting        JobPosting?        @relation(fields: [jobPostingId], references: [id])
  company           Company?           @relation(fields: [companyId], references: [id])
  coverLetter       CoverLetter?       @relation(fields: [coverLetterId], references: [id])
  careerDescription CareerDescription? @relation(fields: [careerDescriptionId], references: [id])
  stages            ApplicationStageHistory[]
  calendarEvents    CalendarEvent[]
}

enum ApplicationStage {
  DOCUMENT
  FIRST_INTERVIEW
  SECOND_INTERVIEW
  FINAL_INTERVIEW
  OFFER
  DONE
}

enum ApplicationResult {
  PASS
  FAIL
  PENDING
  WITHDRAWN
}

model ApplicationStageHistory {
  id            String           @id @default(cuid())
  applicationId String
  stage         ApplicationStage
  scheduledAt   DateTime?
  result        ApplicationResult?
  note          String?
  createdAt     DateTime         @default(now())

  application Application @relation(fields: [applicationId], references: [id])
}

model InterviewPrep {
  id           String   @id @default(cuid())
  userId       String
  jobPostingId String?
  createdAt    DateTime @default(now())

  user       User              @relation(fields: [userId], references: [id])
  jobPosting JobPosting?       @relation(fields: [jobPostingId], references: [id])
  answers    InterviewAnswer[]
}

model InterviewAnswer {
  id                    String   @id @default(cuid())
  interviewPrepId       String
  question              String   @db.Text
  userAnswer            String?  @db.Text
  aiFeedback            String?  @db.Text
  suggestedExperienceId String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  interviewPrep       InterviewPrep @relation(fields: [interviewPrepId], references: [id])
  suggestedExperience Experience?   @relation(fields: [suggestedExperienceId], references: [id])
}

model CalendarEvent {
  id            String    @id @default(cuid())
  userId        String
  applicationId String?
  title         String
  eventType     EventType // DEADLINE | INTERVIEW | OTHER
  scheduledAt   DateTime
  reminderAt    DateTime?
  isNotified    Boolean   @default(false)
  createdAt     DateTime  @default(now())

  user        User         @relation(fields: [userId], references: [id])
  application Application? @relation(fields: [applicationId], references: [id])
}

enum EventType {
  DEADLINE
  INTERVIEW
  OTHER
}

model ResumeProfile {
  id                   String   @id @default(cuid())
  userId               String
  name                 String   // "마케팅 지원용", "기획 지원용"
  selectedExperienceIds String[]
  createdAt            DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

---

## 5. API 엔드포인트 설계

### Auth
```
POST   /auth/register         회원가입
POST   /auth/login            로그인
POST   /auth/refresh          토큰 갱신
POST   /auth/logout           로그아웃
```

### Experiences (내 이력)
```
GET    /experiences           이력 목록 조회 (태그 필터)
POST   /experiences           이력 추가
GET    /experiences/:id       이력 상세
PATCH  /experiences/:id       이력 수정
DELETE /experiences/:id       이력 삭제
POST   /experiences/:id/star  자유서술 → STAR 변환 (AI)
GET    /experiences/tags      역량 태그 목록
```

### Companies (기업)
```
GET    /companies             기업 목록
POST   /companies/analyze     기업 분석 요청 (AI)
GET    /companies/:id         기업 분석 결과
```

### Job Postings (채용공고)
```
POST   /job-postings/parse    URL or 텍스트 파싱 (AI)
GET    /job-postings          스크랩한 공고 목록
GET    /job-postings/:id      공고 상세
DELETE /job-postings/:id      공고 삭제
```

### Cover Letters (자소서)
```
GET    /cover-letters                    자소서 목록
POST   /cover-letters                    자소서 생성
GET    /cover-letters/:id                자소서 상세
PATCH  /cover-letters/:id                자소서 수정
DELETE /cover-letters/:id                자소서 삭제
GET    /cover-letters/:id/matching       역량 매칭도 분석 (AI)
POST   /cover-letters/:id/items          항목 추가
PATCH  /cover-letters/:id/items/:itemId  항목 수정
POST   /cover-letters/:id/items/:itemId/draft    AI 초안 생성 (스트리밍)
POST   /cover-letters/:id/items/:itemId/feedback AI 피드백
```

### Career Descriptions (경력기술서)
```
GET    /career-descriptions           목록
POST   /career-descriptions           생성 (AI 초안 포함)
GET    /career-descriptions/:id       상세
PATCH  /career-descriptions/:id       수정
DELETE /career-descriptions/:id       삭제
GET    /career-descriptions/:id/pdf   PDF 다운로드
```

### Portfolios (포트폴리오)
```
GET    /portfolios           목록
POST   /portfolios           생성
GET    /portfolios/:id       상세
PATCH  /portfolios/:id       수정
DELETE /portfolios/:id       삭제
GET    /portfolios/:id/pdf   PDF 다운로드
```

### Applications (지원 현황)
```
GET    /applications               목록 (필터: stage, result)
POST   /applications               지원 추가
GET    /applications/:id           상세
PATCH  /applications/:id           전형 단계 업데이트
DELETE /applications/:id           삭제
GET    /applications/stats         패턴 분석 통계
POST   /applications/:id/stages    전형 히스토리 추가
```

### Calendar
```
GET    /calendar              일정 목록 (월별)
POST   /calendar              일정 추가
PATCH  /calendar/:id          일정 수정
DELETE /calendar/:id          일정 삭제
```

### Interview Prep (면접 준비)
```
POST   /interview-prep               면접 준비 세션 생성 (예상질문 AI 생성)
GET    /interview-prep/:id           세션 상세
PATCH  /interview-prep/:id/answers/:answerId  답변 저장
POST   /interview-prep/:id/answers/:answerId/feedback  AI 피드백
```

### Files
```
POST   /files/upload         파일 업로드 (PDF 이력서)
POST   /files/parse-resume   이력서 파싱 (pdf-parse → GPT 구조화)
```

---

## 6. AI 통합 설계

### 모델 라우팅 원칙
- **GPT-4o**: 자소서 초안, 경력기술서 초안, 자소서 피드백, 면접 피드백
- **GPT-4o-mini**: PDF 파싱·구조화, 기업 분석 요약, 역량 태깅, 예상 질문 생성

### AI 모듈 구조 (NestJS)
```
src/ai/
├── ai.module.ts
├── ai.service.ts          # OpenAI 클라이언트 관리
├── prompts/
│   ├── star.prompt.ts     # 자유서술 → STAR 변환
│   ├── cover-letter.prompt.ts  # 자소서 초안·피드백
│   ├── career-desc.prompt.ts   # 경력기술서 초안
│   ├── company.prompt.ts       # 기업 분석
│   ├── matching.prompt.ts      # 역량 매칭도
│   ├── interview.prompt.ts     # 예상 질문·피드백
│   └── resume-parse.prompt.ts  # 이력서 파싱
└── streaming/
    └── sse.service.ts     # Server-Sent Events 스트리밍
```

### 자소서 초안 생성 플로우
```
1. 사용자 → POST /cover-letters/:id/items/:itemId/draft
2. NestJS → 이력 데이터 + 기업 분석 + 항목 질문 조합
3. GPT-4o에 스트리밍 요청
4. SSE로 프론트엔드에 실시간 전달
5. 완료 시 DB 저장
```

### 캐싱 전략
- 기업 분석 결과: DB 캐싱 (같은 기업 재분석 방지)
- 역량 태그 목록: 메모리 캐싱

---

## 7. 온보딩 이력서 파싱 플로우

```
1. 사용자가 이력서 PDF 또는 Word(.docx) 업로드
2. PDF: pdf-parse로 텍스트 추출 / Word: mammoth으로 텍스트 추출
3. 추출된 텍스트 → GPT-4o-mini에 전달
4. GPT가 Experience 형태(STAR + 태그)로 구조화
5. 결과를 사용자에게 보여주고 확인·수정
6. 확정 시 DB 저장
```

**지원 형식**: PDF(.pdf), Word(.docx). HWP 미지원.

---

## 8. 채용공고 스크랩 플로우

```
1. 사용자가 URL 붙여넣기
2. 백엔드에서 URL fetch → HTML 파싱 (cheerio)
3. 파싱 실패 시 fallback: 사용자가 텍스트 직접 붙여넣기
4. GPT-4o-mini로 구조화 (기업명, 직무, 마감일, 우대역량 등)
5. Company + JobPosting DB 저장
6. Application 자동 생성 여부 사용자 확인
7. "자소서 작성 시작" / "기업 분석 보기" CTA 제공
```

---

## 9. PDF 생성 플로우 (경력기술서·포트폴리오)

```
1. 사용자가 PDF 다운로드 요청
2. NestJS → Handlebars 템플릿에 데이터 주입
3. Puppeteer로 HTML → PDF 변환
4. Cloudflare R2에 저장
5. Signed URL 반환 → 사용자 다운로드
```

---

## 10. 개발 우선순위 (MVP)

### Phase 1 — MVP (핵심 6개)
1. 인증 (회원가입·로그인)
2. 내 이력 관리 (STAR 구조 입력·편집·태깅)
3. 자소서 작성 (항목·글자수 입력 필수 → 항목별 AI 초안·편집·피드백)
   - 자소서 생성 후 항목(질문 + 글자수 제한)을 먼저 추가해야 AI 초안 생성 가능
   - 항목 추가·삭제 기능 제공, 항목 수는 자유롭게 설정
4. 지원 현황 + 캘린더
5. 기업·직무 분석 (AI 분석 + 역량 매칭도 수치)
   - 기업 이름 입력 또는 채용공고 연결로 분석 시작
   - GPT-4o-mini로 필요 역량·키워드 추출
   - 자소서의 역량 매칭도 점수(0~100) 계산

### Phase 2
6. 역량 매칭도 시각화 (차트, 레이더 그래프 등)
7. 경력기술서 작성·PDF 다운로드
8. 채용공고 URL 스크랩
9. 온보딩 이력서 파싱 (PDF + Word)

### Phase 3
10. 포트폴리오
11. 면접 준비 (예상질문·피드백)
12. 이력 버전 관리 (ResumeProfile)
13. 지원 패턴 분석

---

## 11. 환경 변수

```env
# Database
DATABASE_URL=postgresql://2chi:2chi_password@localhost:5432/2chi_db

# JWT
JWT_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-refresh-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI — https://platform.openai.com/api-keys 에서 발급
# 필수: AI 자소서 초안·피드백·기업 분석·STAR 변환 기능에 사용
OPENAI_API_KEY=sk-...

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# App
NEXT_PUBLIC_API_URL=http://localhost:3001
PORT=3001

# Redis (Bull 큐용)
REDIS_URL=redis://localhost:6379
```

---

## 12. 개발 환경 세팅

```bash
# 설치
pnpm install

# DB 마이그레이션
cd apps/api
npx prisma migrate dev

# 전체 실행
pnpm dev
# web: http://localhost:3000
# api: http://localhost:3001
```

---

## 13. 코드 컨벤션

- **언어**: TypeScript strict mode
- **패키지 매니저**: pnpm
- **린터**: ESLint + Prettier
- **커밋**: Conventional Commits (feat:, fix:, chore: 등)
- **API 응답 형식**:
```typescript
// 성공
{ success: true, data: T }

// 에러
{ success: false, error: { code: string, message: string } }
```
- **인증**: 모든 API는 Authorization Bearer 헤더 사용 (auth 제외)
