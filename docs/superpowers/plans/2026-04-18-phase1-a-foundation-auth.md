# Phase 1-A: Foundation + 인증 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turborepo 모노레포를 처음부터 세팅하고, JWT 기반 회원가입·로그인·토큰 갱신 API와 Next.js 인증 UI를 완성한다.

**Architecture:** pnpm + Turborepo 모노레포에 `apps/api`(NestJS), `apps/web`(Next.js), `packages/shared`(공통 타입/스키마) 3개 패키지. NestJS는 전역 JwtAuthGuard를 적용하고 `@Public()` 데코레이터로 공개 엔드포인트를 표시한다. 인증 토큰은 Next.js 클라이언트에서 Zustand persist로 관리한다.

**Tech Stack:** pnpm, Turborepo, NestJS 10, Prisma 5, PostgreSQL, bcrypt, @nestjs/jwt, Next.js 14 App Router, Zustand, TanStack Query, React Hook Form + Zod, shadcn/ui, Tailwind CSS

**Dependency:** Plan B·C·D는 이 플랜이 완료된 후 시작한다.

---

## 파일 구조

```
(root)/
  package.json
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
  .env.example

packages/shared/
  package.json
  tsconfig.json
  src/
    index.ts
    types/api.ts
    types/user.ts
    schemas/auth.schema.ts

apps/api/
  package.json
  nest-cli.json
  tsconfig.json
  prisma/
    schema.prisma
  src/
    main.ts
    app.module.ts
    prisma/
      prisma.module.ts
      prisma.service.ts
    common/
      filters/http-exception.filter.ts
      guards/jwt-auth.guard.ts
      decorators/public.decorator.ts
      decorators/current-user.decorator.ts
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      strategies/
        jwt.strategy.ts
        jwt-refresh.strategy.ts
    users/
      users.module.ts
      users.service.ts
  test/
    jest-e2e.json
    auth.e2e-spec.ts

apps/web/
  package.json
  next.config.js
  tailwind.config.ts
  postcss.config.js
  tsconfig.json
  vitest.config.ts
  app/
    layout.tsx
    globals.css
    (auth)/
      layout.tsx
      login/page.tsx
      register/page.tsx
    (dashboard)/
      layout.tsx
      page.tsx
  components/
    providers.tsx
    shared/
      sidebar.tsx
  lib/
    api.ts
    auth.ts
    utils.ts
  store/
    auth.store.ts
  hooks/
    use-auth.ts
```

---

### Task 1: 모노레포 루트 세팅

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.env.example`

- [ ] **Step 1: package.json 생성**

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

- [ ] **Step 2: pnpm-workspace.yaml 생성**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: turbo.json 생성**

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

- [ ] **Step 4: tsconfig.base.json 생성**

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

- [ ] **Step 5: .env.example 생성**

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

- [ ] **Step 6: .env 파일 생성 (git 제외)**

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

- [ ] **Step 7: pnpm 설치 확인**

```bash
pnpm install
```

Expected: `Packages: +N` 출력 없이 `Already up to date` 또는 turbo만 설치됨.

- [ ] **Step 8: Docker로 DB + Redis 실행**

```bash
docker-compose up -d db redis
```

Expected: `2chi-db`, `2chi-redis` 컨테이너가 healthy 상태.

```bash
docker-compose ps
```

Expected: db, redis 모두 `(healthy)`.

- [ ] **Step 9: 커밋**

```bash
git init
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .env.example .gitignore docker-compose.yml
git commit -m "chore: initialize monorepo root with Turborepo"
```

---

### Task 2: packages/shared 세팅

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/api.ts`
- Create: `packages/shared/src/types/user.ts`
- Create: `packages/shared/src/schemas/auth.schema.ts`

- [ ] **Step 1: packages/shared/package.json 생성**

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

- [ ] **Step 2: packages/shared/tsconfig.json 생성**

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

- [ ] **Step 3: 공통 API 응답 타입 생성**

`packages/shared/src/types/api.ts`:
```typescript
export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: { code: string; message: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

- [ ] **Step 4: 사용자 타입 생성**

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

- [ ] **Step 5: 인증 Zod 스키마 생성**

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

- [ ] **Step 6: index.ts에서 전부 re-export**

`packages/shared/src/index.ts`:
```typescript
export * from './types/api';
export * from './types/user';
export * from './schemas/auth.schema';
```

- [ ] **Step 7: 타입 체크**

```bash
cd packages/shared && pnpm build
```

Expected: 에러 없음.

- [ ] **Step 8: 커밋**

```bash
git add packages/shared
git commit -m "feat(shared): add common types and Zod schemas for auth"
```

---

### Task 3: NestJS API 프로젝트 세팅

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`

- [ ] **Step 1: apps/api/package.json 생성**

```json
{
  "name": "@2chi/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "test": "jest --passWithNoTests",
    "test:e2e": "jest --config ./test/jest-e2e.json --passWithNoTests",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@2chi/shared": "workspace:*",
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/bull": "^10.1.1",
    "@nestjs/cache-manager": "^2.2.0",
    "@prisma/client": "^5.12.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.1",
    "bull": "^4.12.0",
    "openai": "^4.38.0",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "cache-manager": "^5.4.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.2",
    "@nestjs/testing": "^10.3.0",
    "@types/bcrypt": "^5.0.2",
    "@types/passport-jwt": "^4.0.1",
    "@types/supertest": "^6.0.2",
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.0",
    "prisma": "^5.12.0",
    "supertest": "^7.0.0",
    "typescript": "^5.4.0",
    "ts-jest": "^29.1.0",
    "jest": "^29.7.0"
  }
}
```

- [ ] **Step 2: nest-cli.json 생성**

`apps/api/nest-cli.json`:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": ["@nestjs/swagger"]
  }
}
```

- [ ] **Step 3: tsconfig.json 생성**

`apps/api/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "paths": {
      "@2chi/shared": ["../../packages/shared/src/index.ts"]
    }
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 4: PrismaService 생성**

`apps/api/src/prisma/prisma.service.ts`:
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

`apps/api/src/prisma/prisma.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 5: main.ts 생성**

`apps/api/src/main.ts`:
```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: process.env.WEB_URL || 'http://localhost:3000', credentials: true });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

- [ ] **Step 6: app.module.ts 생성 (최소 버전)**

`apps/api/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 7: pnpm 의존성 설치**

```bash
pnpm install
```

Expected: packages/shared, @nestjs/* 등이 설치됨.

- [ ] **Step 8: 커밋**

```bash
git add apps/api/package.json apps/api/nest-cli.json apps/api/tsconfig.json apps/api/src/main.ts apps/api/src/app.module.ts apps/api/src/prisma
git commit -m "chore(api): scaffold NestJS project with Prisma module"
```

---

### Task 4: Prisma 스키마 + DB 마이그레이션

**Files:**
- Create: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Prisma 초기화**

```bash
cd apps/api && npx prisma init --skip-generate
```

Expected: `prisma/schema.prisma` 파일 생성됨.

- [ ] **Step 2: schema.prisma 전체 내용 작성**

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

- [ ] **Step 3: Prisma 클라이언트 생성 및 마이그레이션**

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev --name init
```

Expected: `migrations/TIMESTAMP_init/migration.sql` 생성, 마이그레이션 적용됨.

- [ ] **Step 4: 커밋**

```bash
git add apps/api/prisma
git commit -m "feat(api): add full Prisma schema for Phase 1"
```

---

### Task 5: 공통 인프라 (Filter, Guard, Decorator)

**Files:**
- Create: `apps/api/src/common/filters/http-exception.filter.ts`
- Create: `apps/api/src/common/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/common/decorators/public.decorator.ts`
- Create: `apps/api/src/common/decorators/current-user.decorator.ts`

- [ ] **Step 1: 실패 테스트 작성**

`apps/api/test/common.e2e-spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Common infrastructure', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(() => app.close());

  it('unknown route should return { success: false, error }', async () => {
    const res = await request(app.getHttpServer()).get('/unknown-route').expect(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBeDefined();
  });
});
```

- [ ] **Step 2: HttpExceptionFilter 구현**

`apps/api/src/common/filters/http-exception.filter.ts`:
```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      const message = Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message.join(', ')
        : exceptionResponse.message || exception.message;

      response.status(status).json({
        success: false,
        error: {
          code: exceptionResponse.error?.toUpperCase().replace(/ /g, '_') || 'ERROR',
          message,
        },
      });
    } else {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: '서버 오류가 발생했습니다.' },
      });
    }
  }
}
```

- [ ] **Step 3: Public 데코레이터 구현**

`apps/api/src/common/decorators/public.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 4: CurrentUser 데코레이터 구현**

`apps/api/src/common/decorators/current-user.decorator.ts`:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 5: JwtAuthGuard 구현**

`apps/api/src/common/guards/jwt-auth.guard.ts`:
```typescript
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

- [ ] **Step 6: jest-e2e.json 생성**

`apps/api/test/jest-e2e.json`:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": {
    "^@2chi/shared$": "<rootDir>/../../../packages/shared/src/index.ts"
  }
}
```

- [ ] **Step 7: 커밋**

```bash
git add apps/api/src/common apps/api/test/jest-e2e.json
git commit -m "feat(api): add exception filter, JWT guard, and decorators"
```

---

### Task 6: Auth 모듈 (register, login, refresh, logout)

**Files:**
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/strategies/jwt.strategy.ts`
- Create: `apps/api/src/auth/strategies/jwt-refresh.strategy.ts`
- Create: `apps/api/src/auth/dto/register.dto.ts`
- Create: `apps/api/src/auth/dto/login.dto.ts`

- [ ] **Step 1: 실패 테스트 작성**

`apps/api/test/auth.e2e-spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'e2e-test' } } });
    await app.close();
  });

  const testUser = {
    email: 'e2e-test-auth@example.com',
    password: 'password123',
    name: '테스트 유저',
    jobType: 'NEW_GRAD',
  };

  describe('POST /auth/register', () => {
    it('should register successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should reject duplicate email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409);

      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...testUser, email: 'not-an-email' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrong-password' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should issue new tokens with valid refresh token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const { refreshToken } = loginRes.body.data;

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/auth.e2e-spec.ts --no-coverage 2>&1 | tail -20
```

Expected: `Cannot find module '../src/app.module'` 또는 `auth module not found` 등 실패.

- [ ] **Step 3: UsersService 구현**

`apps/api/src/users/users.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobType } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: { email: string; password: string; name: string; jobType: JobType }) {
    return this.prisma.user.create({ data });
  }
}
```

`apps/api/src/users/users.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 4: Auth DTOs 구현**

`apps/api/src/auth/dto/register.dto.ts`:
```typescript
import { IsEmail, IsString, MinLength, MaxLength, IsEnum } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '유효한 이메일을 입력하세요.' })
  email: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsEnum(['NEW_GRAD', 'MID_CAREER', 'EXPERIENCED'])
  jobType: 'NEW_GRAD' | 'MID_CAREER' | 'EXPERIENCED';
}
```

`apps/api/src/auth/dto/login.dto.ts`:
```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '유효한 이메일을 입력하세요.' })
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}
```

- [ ] **Step 5: JWT 전략 구현**

`apps/api/src/auth/strategies/jwt.strategy.ts`:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();
    return payload;
  }
}
```

`apps/api/src/auth/strategies/jwt-refresh.strategy.ts`:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();
    return payload;
  }
}
```

- [ ] **Step 6: AuthService 구현**

`apps/api/src/auth/auth.service.ts`:
```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JobType } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(email: string, password: string, name: string, jobType: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new ConflictException('이미 사용 중인 이메일입니다.');

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      name,
      jobType: jobType as JobType,
    });

    return this.generateTokens(user.id, user.email, user.name, user.jobType);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    return this.generateTokens(user.id, user.email, user.name, user.jobType);
  }

  async refresh(userId: string, email: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.generateTokens(user.id, user.email, user.name, user.jobType);
  }

  private generateTokens(userId: string, email: string, name: string, jobType: JobType) {
    const payload = { sub: userId, email };
    return {
      accessToken: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
      }),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
      user: { id: userId, email, name, jobType },
    };
  }
}
```

- [ ] **Step 7: AuthController 구현**

`apps/api/src/auth/auth.controller.ts`:
```typescript
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto.email, dto.password, dto.name, dto.jobType);
    return { success: true, data };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto.email, dto.password);
    return { success: true, data };
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() user: JwtPayload) {
    const data = await this.authService.refresh(user.sub, user.email);
    return { success: true, data };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    return { success: true, data: null };
  }
}
```

- [ ] **Step 8: AuthModule 구현**

`apps/api/src/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({}),
  ],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

- [ ] **Step 9: 테스트 실행 (통과 확인)**

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/auth.e2e-spec.ts --no-coverage
```

Expected: `3 passed` (register, login, refresh 모두 통과).

- [ ] **Step 10: 커밋**

```bash
git add apps/api/src/auth apps/api/src/users apps/api/test/auth.e2e-spec.ts
git commit -m "feat(api): implement JWT auth with register, login, refresh, logout"
```

---

### Task 7: Next.js 웹 프로젝트 세팅

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.js`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/lib/utils.ts`
- Create: `apps/web/components/providers.tsx`

- [ ] **Step 1: package.json 생성**

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

- [ ] **Step 2: next.config.js 생성**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@2chi/shared'],
};

module.exports = nextConfig;
```

- [ ] **Step 3: tsconfig.json 생성**

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

- [ ] **Step 4: tailwind.config.ts 생성**

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

- [ ] **Step 5: postcss.config.js 생성**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: vitest.config.ts 생성**

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

- [ ] **Step 7: globals.css 생성**

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

- [ ] **Step 8: lib/utils.ts 생성**

`apps/web/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 9: providers.tsx 생성**

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

- [ ] **Step 10: root layout.tsx 생성**

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

- [ ] **Step 11: pnpm 설치**

```bash
pnpm install
```

Expected: Next.js, Tailwind 등 설치됨.

- [ ] **Step 12: shadcn/ui 초기화**

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

- [ ] **Step 13: 빌드 확인**

```bash
cd apps/web && pnpm build
```

Expected: 빌드 성공.

- [ ] **Step 14: 커밋**

```bash
git add apps/web/package.json apps/web/next.config.js apps/web/tailwind.config.ts apps/web/postcss.config.js apps/web/tsconfig.json apps/web/vitest.config.ts apps/web/vitest.setup.ts apps/web/app/layout.tsx apps/web/app/globals.css apps/web/lib/utils.ts apps/web/components/providers.tsx apps/web/components.json
git commit -m "chore(web): scaffold Next.js 14 project with Tailwind and shadcn/ui"
```

---

### Task 8: API 클라이언트 + 인증 스토어

**Files:**
- Create: `apps/web/lib/api.ts`
- Create: `apps/web/store/auth.store.ts`
- Create: `apps/web/hooks/use-auth.ts`

- [ ] **Step 1: 실패 테스트 작성**

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

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/web && pnpm test -- lib/__tests__/api.test.ts
```

Expected: `Cannot find module '../api'` — 실패.

- [ ] **Step 3: api.ts 구현**

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

- [ ] **Step 4: 테스트 실행 (통과 확인)**

```bash
cd apps/web && pnpm test -- lib/__tests__/api.test.ts
```

Expected: `2 passed`.

- [ ] **Step 5: auth.store.ts 구현**

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

- [ ] **Step 6: use-auth.ts 훅 구현**

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

- [ ] **Step 7: 커밋**

```bash
git add apps/web/lib/api.ts apps/web/lib/__tests__ apps/web/store/auth.store.ts apps/web/hooks/use-auth.ts
git commit -m "feat(web): add API client, auth store, and auth hooks"
```

---

### Task 9: Auth UI (로그인·회원가입 페이지)

**Files:**
- Create: `apps/web/app/(auth)/layout.tsx`
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/(auth)/register/page.tsx`
- Create: `apps/web/app/(auth)/login/__tests__/page.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

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

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
cd apps/web && pnpm test -- "app/\(auth\)/login"
```

Expected: `Cannot find module '../page'` — 실패.

- [ ] **Step 3: Auth 레이아웃 구현**

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

- [ ] **Step 4: 로그인 페이지 구현**

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

- [ ] **Step 5: 회원가입 페이지 구현**

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

- [ ] **Step 6: 테스트 실행 (통과 확인)**

```bash
cd apps/web && pnpm test -- "app/\(auth\)/login"
```

Expected: `3 passed`.

- [ ] **Step 7: 커밋**

```bash
git add "apps/web/app/(auth)"
git commit -m "feat(web): add login and register pages"
```

---

### Task 10: 대시보드 레이아웃 + 인증 보호

**Files:**
- Create: `apps/web/app/(dashboard)/layout.tsx`
- Create: `apps/web/app/(dashboard)/page.tsx`
- Create: `apps/web/components/shared/sidebar.tsx`
- Create: `apps/web/middleware.ts`

- [ ] **Step 1: middleware.ts 구현 (인증 보호)**

`apps/web/middleware.ts`:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const authCookie = request.cookies.get('2chi-auth');

  if (!isPublic && !authCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

**참고**: Zustand persist는 localStorage 기반이라 서버사이드 미들웨어에서 직접 읽기 어렵다. 로그인 성공 시 쿠키도 함께 설정하도록 `use-auth.ts`를 수정한다:

`apps/web/hooks/use-auth.ts`의 `setAuth` 호출 후에 쿠키도 설정:
```typescript
// useLogin onSuccess 내부에서 추가
if (res.success) {
  setAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
  document.cookie = `2chi-auth=1; path=/; max-age=${7 * 24 * 3600}`;
  router.push('/');
}
```

`useLogout` 함수에서 쿠키 삭제:
```typescript
return () => {
  logout();
  document.cookie = '2chi-auth=; path=/; max-age=0';
  router.push('/login');
};
```

- [ ] **Step 2: Sidebar 구현**

`apps/web/components/shared/sidebar.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Briefcase,
  Calendar,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout } from '@/hooks/use-auth';

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/experience', label: '내 이력', icon: Briefcase },
  { href: '/cover-letter', label: '자소서', icon: FileText },
  { href: '/applications', label: '지원 현황', icon: Calendar },
];

export function Sidebar() {
  const pathname = usePathname();
  const logout = useLogout();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 min-h-screen flex flex-col">
      <div className="px-4 py-5 border-b border-slate-200">
        <span className="text-lg font-semibold text-slate-900">이취</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === href
                ? 'text-slate-900 bg-slate-100 font-medium'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-slate-200">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Dashboard 레이아웃 구현**

`apps/web/app/(dashboard)/layout.tsx`:
```typescript
import { Sidebar } from '@/components/shared/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-6 py-6 min-w-0">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: 홈 페이지 구현**

`apps/web/app/(dashboard)/page.tsx`:
```typescript
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">대시보드</h1>
      <p className="text-sm text-slate-500 mb-8">취업 준비 현황을 한눈에 확인하세요.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">내 이력</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">—</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">자소서</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">—</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">진행 중인 지원</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">—</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 개발 서버로 전체 플로우 확인**

```bash
# 터미널 1
docker-compose up -d db redis

# 터미널 2
cd apps/api && pnpm dev

# 터미널 3
cd apps/web && pnpm dev
```

브라우저에서 확인:
1. `http://localhost:3000` → 미로그인 → `/login` 리다이렉트
2. 회원가입 → 대시보드 이동
3. 로그아웃 → `/login` 이동

- [ ] **Step 6: 커밋**

```bash
git add apps/web/app/(dashboard) apps/web/components/shared/sidebar.tsx apps/web/middleware.ts
git commit -m "feat(web): add authenticated dashboard layout with sidebar and routing guard"
```

---

## Self-Review

### Spec Coverage 체크

| Phase 1-A 요구사항 | 구현 태스크 |
|---|---|
| 모노레포 세팅 (pnpm + Turborepo) | Task 1 |
| packages/shared 공통 타입/스키마 | Task 2 |
| Prisma 스키마 (전체 도메인) | Task 4 |
| NestJS 공통 인프라 | Task 3, 5 |
| 회원가입 API | Task 6 |
| 로그인 API | Task 6 |
| 토큰 갱신 API | Task 6 |
| E2E 테스트 (auth) | Task 6 |
| Next.js 프로젝트 세팅 | Task 7 |
| API 클라이언트 | Task 8 |
| 인증 스토어 (Zustand) | Task 8 |
| 로그인 UI | Task 9 |
| 회원가입 UI | Task 9 |
| 대시보드 레이아웃 | Task 10 |
| 인증 보호 미들웨어 | Task 10 |

### 누락 사항
없음. 모든 Phase 1-A 요구사항이 커버됨.

### Placeholder 검사
코드 블록에 TBD, TODO 없음.

### 타입 일관성
- `JwtPayload.sub` → UserId(string) 전체 일관
- `AuthTokensDto` → packages/shared에서 정의, 프론트/백 공유
- `ApiResponse<T>` → `{ success: true, data }` / `{ success: false, error }` 일관
