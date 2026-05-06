import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { OnboardingService } from './onboarding.service';
import { ConfirmOnboardingDto } from './dto/confirm-onboarding.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('parse')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('PDF 또는 Word 파일만 지원합니다.'), false);
        }
      },
    }),
  )
  async parse(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('파일을 첨부해주세요.');
    }
    const data = await this.onboardingService.parse(user.sub, file);
    return { success: true, data };
  }

  @Post('confirm')
  async confirm(
    @Body() dto: ConfirmOnboardingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.onboardingService.confirm(user.sub, dto);
    return { success: true, data };
  }
}
