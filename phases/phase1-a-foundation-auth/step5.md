# Step 5: auth-module

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/app.module.ts`
- `apps/api/src/common/guards/jwt-auth.guard.ts`
- `apps/api/src/common/decorators/public.decorator.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`
- `apps/api/src/common/filters/http-exception.filter.ts`
- `apps/api/src/prisma/prisma.service.ts`
- `packages/shared/src/schemas/auth.schema.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

JWT 기반 인증 모듈을 구현한다: register, login, refresh, logout 엔드포인트.

**CRITICAL:** auth 엔드포인트(/auth/*)는 `@Public()` 데코레이터로 표시해 전역 JwtAuthGuard를 우회한다. JWT_SECRET, JWT_REFRESH_SECRET은 환경 변수에서 읽는다.

**생성할 파일:**
- `apps/api/src/users/users.module.ts`
- `apps/api/src/users/users.service.ts`
- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/strategies/jwt.strategy.ts`
- `apps/api/src/auth/strategies/jwt-refresh.strategy.ts`
- `apps/api/src/auth/dto/register.dto.ts`
- `apps/api/src/auth/dto/login.dto.ts`
- `apps/api/test/auth.e2e-spec.ts`

### Step 1: 실패 테스트 작성

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

### Step 2: 테스트 실행 (실패 확인)

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/auth.e2e-spec.ts --no-coverage 2>&1 | tail -20
```

Expected: `Cannot find module '../src/app.module'` 또는 `auth module not found` 등 실패.

### Step 3: UsersService 구현

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

### Step 4: Auth DTOs 구현

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

### Step 5: JWT 전략 구현

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

### Step 6: AuthService 구현

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

### Step 7: AuthController 구현

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

### Step 8: AuthModule 구현

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

### Step 9: 테스트 실행 (통과 확인)

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/auth.e2e-spec.ts --no-coverage
```

Expected: `3 passed` (register, login, refresh 모두 통과).

### Step 10: 커밋

```bash
git add apps/api/src/auth apps/api/src/users apps/api/test/auth.e2e-spec.ts
git commit -m "feat(api): implement JWT auth with register, login, refresh, logout"
```

## Acceptance Criteria

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json test/auth.e2e-spec.ts --no-coverage
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
- 비밀번호를 평문으로 저장하지 마라. 반드시 bcrypt로 해싱한다 (rounds: 12)
- JWT_SECRET, JWT_REFRESH_SECRET을 하드코딩하지 마라. 반드시 ConfigService를 통해 환경 변수에서 읽어라
