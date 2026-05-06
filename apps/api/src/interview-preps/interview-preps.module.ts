import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AiModule } from '../ai/ai.module';
import { InterviewPrepsController } from './interview-preps.controller';
import { InterviewPrepsService } from './interview-preps.service';
import { InterviewPrepsProcessor } from './interview-preps.processor';

@Module({
  imports: [
    AiModule,
    BullModule.registerQueue({ name: 'interview-prep' }),
  ],
  controllers: [InterviewPrepsController],
  providers: [InterviewPrepsService, InterviewPrepsProcessor],
})
export class InterviewPrepsModule {}
