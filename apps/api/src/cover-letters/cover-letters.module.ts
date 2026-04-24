import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CoverLettersController } from './cover-letters.controller';
import { CoverLettersService, COVER_LETTER_QUEUE } from './cover-letters.service';
import { CoverLetterProcessor } from './cover-letter.processor';
import { AiModule } from '../ai/ai.module';
import { ExperiencesModule } from '../experiences/experiences.module';

@Module({
  imports: [
    AiModule,
    ExperiencesModule,
    BullModule.registerQueue({ name: COVER_LETTER_QUEUE }),
  ],
  controllers: [CoverLettersController],
  providers: [CoverLettersService, CoverLetterProcessor],
})
export class CoverLettersModule {}
