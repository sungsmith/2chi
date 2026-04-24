import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { CompaniesService, COMPANY_QUEUE } from './companies.service';

@Processor(COMPANY_QUEUE)
export class CompanyProcessor {
  private readonly logger = new Logger(CompanyProcessor.name);

  constructor(private companiesService: CompaniesService) {}

  @Process('analyze')
  async handleAnalyze(job: Job<{ userId: string; name: string; jobTitle?: string; additionalContext?: string }>) {
    const { userId, name, jobTitle, additionalContext } = job.data;
    try {
      await this.companiesService.analyzeAndUpsert(userId, { name, jobTitle, additionalContext });
    } catch (err) {
      this.logger.error(`Job ${job.id} failed: ${(err as Error).message}`, (err as Error).stack);
      throw err;
    }
  }
}
