import {
  Controller, Get, Post, Delete, Param, Body,
  HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CoverLettersService } from './cover-letters.service';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { CreateCoverLetterItemDto } from './dto/create-cover-letter-item.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('cover-letters')
export class CoverLettersController {
  constructor(private coverLettersService: CoverLettersService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.coverLettersService.findAll(user.sub);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.coverLettersService.findOne(id, user.sub);
    return { success: true, data };
  }

  @Post()
  async create(@Body() dto: CreateCoverLetterDto, @CurrentUser() user: JwtPayload) {
    const data = await this.coverLettersService.create(user.sub, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.coverLettersService.remove(id, user.sub);
  }

  @Post(':id/items')
  async addItem(
    @Param('id') id: string,
    @Body() dto: CreateCoverLetterItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.coverLettersService.addItem(id, user.sub, dto);
    return { success: true, data };
  }

  @Post(':id/items/:itemId/draft')
  async streamDraft(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    await this.coverLettersService.streamDraft(id, itemId, user.sub, res);
  }

  @Post(':id/matching')
  async enqueueMatching(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.coverLettersService.enqueueMatching(id, user.sub);
    return { success: true, data };
  }
}
