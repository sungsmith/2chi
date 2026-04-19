import { Controller, Get, Param } from '@nestjs/common';
import { CoverLettersService } from './cover-letters.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('cover-letters')
export class CoverLettersController {
  constructor(private coverLettersService: CoverLettersService) {}

  @Get(':id/matching')
  async calculateMatching(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.coverLettersService.calculateMatching(id, user.sub);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.coverLettersService.findOne(id, user.sub);
    return { success: true, data };
  }
}
