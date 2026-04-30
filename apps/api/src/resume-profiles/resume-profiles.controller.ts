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
} from '@nestjs/common';
import { ResumeProfilesService } from './resume-profiles.service';
import { CreateResumeProfileDto } from './dto/create-resume-profile.dto';
import { UpdateResumeProfileDto } from './dto/update-resume-profile.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('resume-profiles')
export class ResumeProfilesController {
  constructor(private readonly resumeProfilesService: ResumeProfilesService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.resumeProfilesService.findAll(user.sub);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.resumeProfilesService.findOne(id, user.sub);
    return { success: true, data };
  }

  @Post()
  async create(@Body() dto: CreateResumeProfileDto, @CurrentUser() user: JwtPayload) {
    const data = await this.resumeProfilesService.create(user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateResumeProfileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.resumeProfilesService.update(id, user.sub, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.resumeProfilesService.remove(id, user.sub);
  }
}
