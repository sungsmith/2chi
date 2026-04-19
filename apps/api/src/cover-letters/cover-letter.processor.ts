import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { CoverLettersService, COVER_LETTER_QUEUE } from './cover-letters.service';

@Processor(COVER_LETTER_QUEUE)
export class CoverLetterProcessor {
  constructor(private coverLettersService: CoverLettersService) {}

  @Process('calculate-matching')
  async handleMatching(job: Job<{ coverLetterId: string; userId: string }>) {
    const { coverLetterId, userId } = job.data;
    await this.coverLettersService.calculateMatching(coverLetterId, userId);
  }
}
