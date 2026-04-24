import { IsEnum, IsOptional, IsDateString, IsString, MaxLength } from 'class-validator';
import { ApplicationStage, ApplicationResult } from '@prisma/client';

export class AddStageDto {
  @IsEnum(ApplicationStage)
  stage!: ApplicationStage;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  customLabel?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsEnum(ApplicationResult)
  result?: ApplicationResult;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
