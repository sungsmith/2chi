import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CareerDescriptionsService } from './career-descriptions.service';
import { CreateCareerDescriptionDto } from './dto/create-career-description.dto';
import { UpdateCareerDescriptionDto } from './dto/update-career-description.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { GenerateSectionDraftDto } from './dto/generate-section-draft.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('career-descriptions')
export class CareerDescriptionsController {
  constructor(private readonly careerDescriptionsService: CareerDescriptionsService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.careerDescriptionsService.findAll(user.sub);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.careerDescriptionsService.findOne(id, user.sub);
    return { success: true, data };
  }

  @Post()
  async create(@Body() dto: CreateCareerDescriptionDto, @CurrentUser() user: JwtPayload) {
    const data = await this.careerDescriptionsService.create(user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCareerDescriptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.careerDescriptionsService.update(id, user.sub, dto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.careerDescriptionsService.remove(id, user.sub);
    return { success: true, data: null };
  }

  @Post(':id/sections/:sectionId/draft')
  async streamSectionDraft(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: GenerateSectionDraftDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    await this.careerDescriptionsService.streamSectionDraft(id, sectionId, user.sub, dto, res);
  }

  @Patch(':id/sections/:sectionId')
  async updateSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.careerDescriptionsService.updateSection(id, sectionId, user.sub, dto);
    return { success: true, data };
  }

  @Post(':id/pdf')
  async generatePdf(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const url = await this.careerDescriptionsService.generatePdf(id, user.sub);
    return { success: true, data: { url } };
  }
}
