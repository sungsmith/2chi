# Step 3: prisma-schema-migration

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/prisma/prisma.service.ts`
- `apps/api/src/prisma/prisma.module.ts`
- `.env.example`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Prisma 스키마를 작성하고 DB 마이그레이션을 실행한다. Phase 1 전체 도메인(User, Experience, CoverLetter, Application, Calendar 등)을 한 번에 정의한다.

**생성할 파일:**
- `apps/api/prisma/schema.prisma`

### Step 1: Prisma 초기화

```bash
cd apps/api && npx prisma init --skip-generate
```

Expected: `prisma/schema.prisma` 파일 생성됨.

### Step 2: schema.prisma 전체 내용 작성

`apps/api/prisma/schema.prisma`:
```prisma
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
  jobType     JobType  @default(NEW_GRAD)
  targetField String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  experiences        Experience[]
  coverLetters       CoverLetter[]
  careerDescriptions CareerDescription[]
  portfolios         Portfolio[]
  applications       Application[]
  interviewPreps     InterviewPrep[]
  calendarEvents     CalendarEvent[]
  resumeProfiles     ResumeProfile[]
  companies          Company[]
  jobPostings        JobPosting[]
}

enum JobType {
  NEW_GRAD
  MID_CAREER
  EXPERIENCED
}

model Experience {
  id           String         @id @default(cuid())
  userId       String
  title        String
  type         ExperienceType
  companyName  String?
  startDate    DateTime?
  endDate      DateTime?
  isCurrent    Boolean        @default(false)
  situation    String?        @db.Text
  task         String?        @db.Text
  action       String?        @db.Text
  result       String?        @db.Text
  resultMetric String?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  user                User                       @relation(fields: [userId], references: [id], onDelete: Cascade)
  tags                ExperienceTag[]
  coverLetterItemRefs CoverLetterItemExperience[]
  careerDescSections  CareerDescriptionSection[]
  portfolioSections   PortfolioSection[]
  interviewAnswers    InterviewAnswer[]
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
  experienceId String
  tagId        String
  experience   Experience @relation(fields: [experienceId], references: [id], onDelete: Cascade)
  tag          Tag        @relation(fields: [tagId], references: [id])

  @@id([experienceId, tagId])
}

model Company {
  id              String    @id @default(cuid())
  userId          String
  name            String
  industry        String?
  officialInfo    Json?
  unofficialInfo  Json?
  keyCompetencies String[]
  analyzedAt      DateTime?
  createdAt       DateTime  @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobPostings  JobPosting[]
  coverLetters CoverLetter[]
  applications Application[]
}

model JobPosting {
  id                   String    @id @default(cuid())
  userId               String
  companyId            String?
  url                  String?
  title                String
  department           String?
  deadline             DateTime?
  requiredCompetencies String[]
  preferredCompetencies String[]
  requirements         String?   @db.Text
  rawText              String?   @db.Text
  parsedAt             DateTime?
  createdAt            DateTime  @default(now())

  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  company        Company?        @relation(fields: [companyId], references: [id])
  coverLetters   CoverLetter[]
  applications   Application[]
  interviewPreps InterviewPrep[]
}

model CoverLetter {
  id            String            @id @default(cuid())
  userId        String
  jobPostingId  String?
  companyId     String?
  title         String
  matchingScore Int?
  status        CoverLetterStatus @default(DRAFT)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  user         User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobPosting   JobPosting?       @relation(fields: [jobPostingId], references: [id])
  company      Company?          @relation(fields: [companyId], references: [id])
  items        CoverLetterItem[]
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
  feedback      Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  coverLetter CoverLetter                @relation(fields: [coverLetterId], references: [id], onDelete: Cascade)
  experiences CoverLetterItemExperience[]
}

model CoverLetterItemExperience {
  coverLetterItemId String
  experienceId      String
  coverLetterItem   CoverLetterItem @relation(fields: [coverLetterItemId], references: [id], onDelete: Cascade)
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

  user     User                       @relation(fields: [userId], references: [id], onDelete: Cascade)
  sections CareerDescriptionSection[]
  applications Application[]
}

model CareerDescriptionSection {
  id                  String    @id @default(cuid())
  careerDescriptionId String
  experienceId        String?
  sectionType         String
  order               Int
  content             Json

  careerDescription CareerDescription @relation(fields: [careerDescriptionId], references: [id], onDelete: Cascade)
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

  user     User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  sections PortfolioSection[]
}

model PortfolioSection {
  id           String  @id @default(cuid())
  portfolioId  String
  experienceId String?
  sectionType  String
  order        Int
  content      Json

  portfolio  Portfolio  @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
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

  user              User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobPosting        JobPosting?              @relation(fields: [jobPostingId], references: [id])
  company           Company?                 @relation(fields: [companyId], references: [id])
  coverLetter       CoverLetter?             @relation(fields: [coverLetterId], references: [id])
  careerDescription CareerDescription?       @relation(fields: [careerDescriptionId], references: [id])
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
  id            String            @id @default(cuid())
  applicationId String
  stage         ApplicationStage
  scheduledAt   DateTime?
  result        ApplicationResult?
  note          String?
  createdAt     DateTime          @default(now())

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}

model InterviewPrep {
  id           String   @id @default(cuid())
  userId       String
  jobPostingId String?
  createdAt    DateTime @default(now())

  user       User              @relation(fields: [userId], references: [id], onDelete: Cascade)
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

  interviewPrep       InterviewPrep @relation(fields: [interviewPrepId], references: [id], onDelete: Cascade)
  suggestedExperience Experience?   @relation(fields: [suggestedExperienceId], references: [id])
}

model CalendarEvent {
  id            String    @id @default(cuid())
  userId        String
  applicationId String?
  title         String
  eventType     EventType
  scheduledAt   DateTime
  reminderAt    DateTime?
  isNotified    Boolean   @default(false)
  createdAt     DateTime  @default(now())

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  application Application? @relation(fields: [applicationId], references: [id])
}

enum EventType {
  DEADLINE
  INTERVIEW
  OTHER
}

model ResumeProfile {
  id                    String   @id @default(cuid())
  userId                String
  name                  String
  selectedExperienceIds String[]
  createdAt             DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Step 3: Prisma 클라이언트 생성 및 마이그레이션

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
```

Expected: `migrations/TIMESTAMP_init/migration.sql` 생성, 마이그레이션 적용됨.

### Step 4: 커밋

```bash
git add apps/api/prisma
git commit -m "feat(api): add full Prisma schema for Phase 1"
```

## Acceptance Criteria

```bash
cd apps/api && npx prisma generate && npx prisma migrate dev --name init
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
- Raw SQL 사용 금지. DB 쿼리는 모두 Prisma를 통해서만 한다
- DATABASE_URL이 .env에 올바르게 설정되어 있어야 한다. Docker가 실행 중인지 확인하라
