import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApplicationResult } from '@prisma/client';

export class UpdateStageDto {
  @IsOptional()
  @IsEnum(ApplicationResult)
  result?: ApplicationResult;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
