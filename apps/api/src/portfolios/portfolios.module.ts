import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';
import { ExperiencesModule } from '../experiences/experiences.module';
import { PortfoliosController } from './portfolios.controller';
import { PortfoliosService } from './portfolios.service';

@Module({
  imports: [AiModule, FilesModule, ExperiencesModule],
  controllers: [PortfoliosController],
  providers: [PortfoliosService],
})
export class PortfoliosModule {}
