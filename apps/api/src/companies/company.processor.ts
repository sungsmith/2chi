import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { CompaniesService, COMPANY_QUEUE } from './companies.service';

@Processor(COMPANY_QUEUE)
export class CompanyProcessor {
  constructor(private companiesService: CompaniesService) {}

  @Process('analyze')
  async handleAnalyze(job: Job<{ userId: string; name: string; jobTitle?: string; additionalContext?: string }>) {
    const { userId, name, jobTitle, additionalContext } = job.data;
    await this.companiesService.analyzeAndUpsert(userId, { name, jobTitle, additionalContext });
  }
}
