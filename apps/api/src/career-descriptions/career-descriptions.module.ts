import { Module } from '@nestjs/common';
import { CareerDescriptionsController } from './career-descriptions.controller';
import { CareerDescriptionsService } from './career-descriptions.service';
import { AiModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';
import { ExperiencesModule } from '../experiences/experiences.module';

@Module({
  imports: [AiModule, FilesModule, ExperiencesModule],
  controllers: [CareerDescriptionsController],
  providers: [CareerDescriptionsService],
})
export class CareerDescriptionsModule {}
