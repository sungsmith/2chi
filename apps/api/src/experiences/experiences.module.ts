import { Module } from '@nestjs/common';
import { ExperiencesService } from './experiences.service';

@Module({
  providers: [ExperiencesService],
  exports: [ExperiencesService],
})
export class ExperiencesModule {}
