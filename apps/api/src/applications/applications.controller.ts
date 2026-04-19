import {
  Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AddStageDto } from './dto/add-stage.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('applications')
export class ApplicationsController {
  constructor(private applicationsService: ApplicationsService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.applicationsService.findAll(user.sub);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.applicationsService.findOne(id, user.sub);
    return { success: true, data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateApplicationDto, @CurrentUser() user: JwtPayload) {
    const data = await this.applicationsService.create(user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.applicationsService.update(id, user.sub, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.applicationsService.remove(id, user.sub);
    return { success: true, data: null };
  }

  @Post(':id/stages')
  @HttpCode(HttpStatus.CREATED)
  async addStage(
    @Param('id') id: string,
    @Body() dto: AddStageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.applicationsService.addStage(id, user.sub, dto);
    return { success: true, data };
  }
}
