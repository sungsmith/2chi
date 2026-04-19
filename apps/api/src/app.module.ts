import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ApplicationsModule } from './applications/applications.module';
import { CalendarModule } from './calendar/calendar.module';
import { CompaniesModule } from './companies/companies.module';
import { CoverLettersModule } from './cover-letters/cover-letters.module';
import { ExperiencesModule } from './experiences/experiences.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ApplicationsModule,
    CalendarModule,
    CompaniesModule,
    CoverLettersModule,
    ExperiencesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
