import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [
    AiModule,
    PrismaModule,
    CacheModule.register({ ttl: 30 * 60 * 1000 }),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
