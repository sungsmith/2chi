import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CompaniesService, COMPANY_QUEUE } from './companies.service';
import { CompaniesController } from './companies.controller';
import { CompanyProcessor } from './company.processor';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    AiModule,
    BullModule.registerQueue({ name: COMPANY_QUEUE }),
  ],
  providers: [CompaniesService, CompanyProcessor],
  controllers: [CompaniesController],
  exports: [CompaniesService],
})
export class CompaniesModule {}
