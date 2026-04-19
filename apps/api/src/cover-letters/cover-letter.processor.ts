import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { CoverLettersService, COVER_LETTER_QUEUE } from './cover-letters.service';

@Processor(COVER_LETTER_QUEUE)
export class CoverLetterProcessor {
  private readonly logger = new Logger(CoverLetterProcessor.name);

  constructor(private coverLettersService: CoverLettersService) {}

  @Process('calculate-matching')
  async handleMatching(job: Job<{ coverLetterId: string; userId: string }>) {
    const { coverLetterId, userId } = job.data;
    try {
      await this.coverLettersService.calculateMatching(coverLetterId, userId);
    } catch (err) {
      this.logger.error(`Job ${job.id} failed: ${(err as Error).message}`, (err as Error).stack);
      throw err;
    }
  }
}
