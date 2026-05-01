import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { InterviewPrepsService } from './interview-preps.service';
import { CreateInterviewPrepDto } from './dto/create-interview-prep.dto';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('interview-preps')
@UseGuards(JwtAuthGuard)
export class InterviewPrepsController {
  constructor(private readonly interviewPrepsService: InterviewPrepsService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.interviewPrepsService.findAll(user.sub);
    return { success: true, data };
  }

  @Get('jobs/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const data = await this.interviewPrepsService.getJobStatus(jobId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.interviewPrepsService.findOne(id, user.sub);
    return { success: true, data };
  }

  @Post()
  async create(@Body() dto: CreateInterviewPrepDto, @CurrentUser() user: JwtPayload) {
    const data = await this.interviewPrepsService.create(user.sub, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.interviewPrepsService.remove(id, user.sub);
  }

  @Post(':id/generate-questions')
  async generateQuestions(
    @Param('id') id: string,
    @Body() dto: GenerateQuestionsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.interviewPrepsService.generateQuestions(id, user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id/answers/:answerId')
  async saveAnswer(
    @Param('id') id: string,
    @Param('answerId') answerId: string,
    @Body() dto: SaveAnswerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.interviewPrepsService.saveAnswer(id, answerId, user.sub, dto);
    return { success: true, data };
  }

  @Post(':id/answers/:answerId/feedback')
  async requestFeedback(
    @Param('id') id: string,
    @Param('answerId') answerId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.interviewPrepsService.requestFeedback(id, answerId, user.sub);
    return { success: true, data };
  }
}
