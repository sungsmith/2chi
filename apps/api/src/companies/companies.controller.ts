import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { AnalyzeCompanyDto } from './dto/analyze-company.dto';
import { GapAnalysisDto } from './dto/gap-analysis.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('companies')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.companiesService.findAll(user.sub);
    return { success: true, data };
  }

  @Get('jobs/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const data = await this.companiesService.getJobStatus(jobId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.companiesService.findOne(id, user.sub);
    return { success: true, data };
  }

  @Post('analyze')
  @HttpCode(HttpStatus.ACCEPTED)
  async analyze(@Body() dto: AnalyzeCompanyDto, @CurrentUser() user: JwtPayload) {
    const data = await this.companiesService.enqueueAnalysis(user.sub, dto);
    return { success: true, data };
  }

  @Post(':id/gap-analysis')
  async gapAnalysis(
    @Param('id') id: string,
    @Body() dto: GapAnalysisDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.companiesService.analyzeGap(id, dto.jobPostingId, user.sub);
    return { success: true, data };
  }
}
