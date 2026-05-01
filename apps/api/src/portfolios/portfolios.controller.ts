import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { CreatePortfolioSectionDto } from './dto/create-portfolio-section.dto';
import { UpdatePortfolioSectionDto } from './dto/update-portfolio-section.dto';

@Controller('portfolios')
@UseGuards(JwtAuthGuard)
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.portfoliosService.findAll(user.sub);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.portfoliosService.findOne(id, user.sub);
    return { success: true, data };
  }

  @Post()
  async create(@Body() dto: CreatePortfolioDto, @CurrentUser() user: JwtPayload) {
    const data = await this.portfoliosService.create(user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.portfoliosService.update(id, user.sub, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.portfoliosService.remove(id, user.sub);
  }

  @Post(':id/sections')
  async createSection(
    @Param('id') id: string,
    @Body() dto: CreatePortfolioSectionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.portfoliosService.createSection(id, user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id/sections/:sectionId')
  async updateSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdatePortfolioSectionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.portfoliosService.updateSection(id, sectionId, user.sub, dto);
    return { success: true, data };
  }

  @Delete(':id/sections/:sectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.portfoliosService.removeSection(id, sectionId, user.sub);
  }

  @Put(':id/sections/reorder')
  async reorderSections(
    @Param('id') id: string,
    @Body() body: { sectionIds: string[] },
    @CurrentUser() user: JwtPayload,
  ) {
    await this.portfoliosService.reorderSections(id, user.sub, body.sectionIds);
    return { success: true, data: null };
  }

  @Post(':id/sections/:sectionId/draft')
  async streamSectionDraft(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    await this.portfoliosService.streamSectionDraft(id, sectionId, user.sub, res);
  }

  @Post(':id/pdf')
  async generatePdf(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.portfoliosService.generatePdf(id, user.sub);
    return { success: true, data };
  }

  @Get(':id/pdf-url')
  async getPdfUrl(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const url = await this.portfoliosService.getPdfUrl(id, user.sub);
    return { success: true, data: { url } };
  }
}
