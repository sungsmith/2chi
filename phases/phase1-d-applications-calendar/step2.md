# Step 2: calendar-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/app.module.ts`
- `apps/api/src/common/decorators/current-user.decorator.ts`
- `apps/api/src/prisma/prisma.service.ts`
- `packages/shared/src/types/application.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Calendar CRUD API를 구현한다. 월별 이벤트 조회와 직접 이벤트 추가/삭제를 지원한다.

**생성할 파일:**
- `apps/api/src/calendar/dto/create-event.dto.ts`
- `apps/api/src/calendar/dto/update-event.dto.ts`
- `apps/api/src/calendar/calendar.service.ts`
- `apps/api/src/calendar/calendar.controller.ts`
- `apps/api/src/calendar/calendar.module.ts`

**수정할 파일:**
- `apps/api/src/app.module.ts`

### Step 1: Calendar DTOs 구현

`apps/api/src/calendar/dto/create-event.dto.ts`:
```typescript
import { IsString, IsEnum, IsDateString, IsOptional, MaxLength } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsEnum(['DEADLINE', 'INTERVIEW', 'OTHER'])
  eventType: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsDateString()
  reminderAt?: string;
}
```

`apps/api/src/calendar/dto/update-event.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {}
```

### Step 2: CalendarService 구현

`apps/api/src/calendar/calendar.service.ts`:
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventType } from '@prisma/client';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async findByMonth(userId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    return this.prisma.calendarEvent.findMany({
      where: {
        userId,
        scheduledAt: { gte: start, lte: end },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateEventDto) {
    return this.prisma.calendarEvent.create({
      data: {
        userId,
        title: dto.title,
        eventType: dto.eventType as EventType,
        scheduledAt: new Date(dto.scheduledAt),
        applicationId: dto.applicationId,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateEventDto) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('일정을 찾을 수 없습니다.');
    if (event.userId !== userId) throw new ForbiddenException();

    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        title: dto.title,
        eventType: dto.eventType as EventType | undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('일정을 찾을 수 없습니다.');
    if (event.userId !== userId) throw new ForbiddenException();
    return this.prisma.calendarEvent.delete({ where: { id } });
  }
}
```

### Step 3: CalendarController 구현

`apps/api/src/calendar/calendar.controller.ts`:
```typescript
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get()
  async findByMonth(
    @CurrentUser() user: JwtPayload,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    const data = await this.calendarService.findByMonth(user.sub, y, m);
    return { success: true, data };
  }

  @Post()
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: JwtPayload) {
    const data = await this.calendarService.create(user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.calendarService.update(id, user.sub, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.calendarService.remove(id, user.sub);
    return { success: true, data: null };
  }
}
```

### Step 4: CalendarModule 구현

`apps/api/src/calendar/calendar.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';

@Module({
  providers: [CalendarService],
  controllers: [CalendarController],
})
export class CalendarModule {}
```

### Step 5: app.module.ts에 CalendarModule 추가

`apps/api/src/app.module.ts`의 imports 배열에 추가:
```typescript
import { CalendarModule } from './calendar/calendar.module';

// imports 배열에 추가:
CalendarModule,
```

### Step 6: 커밋

```bash
git add apps/api/src/calendar apps/api/src/app.module.ts
git commit -m "feat(api): add Calendar CRUD module"
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
3. 결과에 따라 `phases/phase1-d-applications-calendar/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- Raw SQL 사용 금지. DB 쿼리는 모두 Prisma를 통해서만 한다
- 다른 유저의 캘린더 이벤트를 조회·수정·삭제할 수 없도록 ForbiddenException 처리를 반드시 포함하라
