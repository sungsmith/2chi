# Step 2: nestjs-api-scaffold

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `packages/shared/src/index.ts`
- `packages/shared/src/types/api.ts`
- `tsconfig.base.json`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

NestJS API 프로젝트를 세팅한다. PrismaModule(글로벌)과 main.ts까지 만든다. Auth/Users 모듈은 다음 step에서 구현한다.

**생성할 파일:**
- `apps/api/package.json`
- `apps/api/nest-cli.json`
- `apps/api/tsconfig.json`
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/prisma/prisma.service.ts`
- `apps/api/src/prisma/prisma.module.ts`

### Step 1: apps/api/package.json 생성

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

### Step 2: nest-cli.json 생성

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

### Step 3: tsconfig.json 생성

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

### Step 4: PrismaService 생성

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

### Step 5: main.ts 생성

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

### Step 6: app.module.ts 생성 (최소 버전)

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

### Step 7: pnpm 의존성 설치

```bash
pnpm install
```

Expected: packages/shared, @nestjs/* 등이 설치됨.

### Step 8: 커밋

```bash
git add apps/api/package.json apps/api/nest-cli.json apps/api/tsconfig.json apps/api/src/main.ts apps/api/src/app.module.ts apps/api/src/prisma
git commit -m "chore(api): scaffold NestJS project with Prisma module"
```

## Acceptance Criteria

```bash
pnpm install && cd apps/api && pnpm lint
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
