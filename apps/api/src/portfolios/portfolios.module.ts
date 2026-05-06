import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AiModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';
import { ExperiencesModule } from '../experiences/experiences.module';
import { PortfoliosController } from './portfolios.controller';
import { PortfoliosService } from './portfolios.service';
import { PortfoliosProcessor } from './portfolios.processor';

@Module({
  imports: [
    AiModule,
    FilesModule,
    ExperiencesModule,
    BullModule.registerQueue({ name: 'portfolio' }),
  ],
  controllers: [PortfoliosController],
  providers: [PortfoliosService, PortfoliosProcessor],
})
export class PortfoliosModule {}
