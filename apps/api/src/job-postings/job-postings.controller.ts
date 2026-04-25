import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { JobPostingsService } from './job-postings.service';
import { ParseJobPostingDto } from './dto/parse-job-posting.dto';
import { ScrapeJobPostingDto } from './dto/scrape-job-posting.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('job-postings')
export class JobPostingsController {
  constructor(private jobPostingsService: JobPostingsService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.jobPostingsService.findAll(user.sub);
    return { success: true, data };
  }

  @Post('parse')
  async parse(@Body() dto: ParseJobPostingDto, @CurrentUser() user: JwtPayload) {
    const data = await this.jobPostingsService.parseAndCreate(user.sub, dto);
    return { success: true, data };
  }

  @Post('scrape')
  async scrape(@Body() dto: ScrapeJobPostingDto, @CurrentUser() user: JwtPayload) {
    const data = await this.jobPostingsService.scrapeAndCreate(user.sub, dto);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.jobPostingsService.findOne(id, user.sub);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.jobPostingsService.delete(id, user.sub);
    return { success: true, data: null };
  }
}
