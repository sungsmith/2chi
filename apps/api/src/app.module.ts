import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ApplicationsModule } from './applications/applications.module';
import { CalendarModule } from './calendar/calendar.module';
import { CompaniesModule } from './companies/companies.module';
import { CoverLettersModule } from './cover-letters/cover-letters.module';
import { ExperiencesModule } from './experiences/experiences.module';
import { FilesModule } from './files/files.module';
import { CareerDescriptionsModule } from './career-descriptions/career-descriptions.module';
import { JobPostingsModule } from './job-postings/job-postings.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) throw new Error('REDIS_URL environment variable is required');
        return { redis: redisUrl };
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ApplicationsModule,
    CalendarModule,
    CompaniesModule,
    CoverLettersModule,
    ExperiencesModule,
    FilesModule,
    CareerDescriptionsModule,
    JobPostingsModule,
    OnboardingModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
