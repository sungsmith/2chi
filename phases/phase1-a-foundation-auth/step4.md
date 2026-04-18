# Step 4: common-infrastructure

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/app.module.ts`
- `apps/api/src/prisma/prisma.service.ts`
- `apps/api/src/main.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

NestJS 공통 인프라를 구현한다: HttpExceptionFilter(전역 에러 포맷), JwtAuthGuard(전역 인증), Public 데코레이터, CurrentUser 데코레이터.

**CRITICAL:** 모든 API 응답은 `{ success: true, data: T }` / `{ success: false, error: { code: string, message: string } }` 형식을 따라야 한다. HttpExceptionFilter가 에러 응답 형식을 담당한다.

**생성할 파일:**
- `apps/api/src/common/filters/http-exception.filter.ts`
- `apps/api/src/common/guards/jwt-auth.guard.ts`
- `apps/api/src/common/decorators/public.decorator.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`
- `apps/api/test/jest-e2e.json`

### Step 1: 실패 테스트 작성

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

### Step 2: HttpExceptionFilter 구현

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

### Step 3: Public 데코레이터 구현

`apps/api/src/common/decorators/public.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### Step 4: CurrentUser 데코레이터 구현

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

### Step 5: JwtAuthGuard 구현

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

### Step 6: jest-e2e.json 생성

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

### Step 7: 커밋

```bash
git add apps/api/src/common apps/api/test/jest-e2e.json
git commit -m "feat(api): add exception filter, JWT guard, and decorators"
```

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
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
- HttpExceptionFilter의 에러 응답은 반드시 `{ success: false, error: { code, message } }` 형식을 유지하라. 다른 형식 금지
