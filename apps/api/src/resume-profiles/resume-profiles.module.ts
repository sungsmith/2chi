import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResumeProfilesController } from './resume-profiles.controller';
import { ResumeProfilesService } from './resume-profiles.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResumeProfilesController],
  providers: [ResumeProfilesService],
})
export class ResumeProfilesModule {}
