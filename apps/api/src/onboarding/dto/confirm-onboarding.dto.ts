import { Type } from 'class-transformer';
import {
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
  ArrayMinSize,
} from 'class-validator';

class ParsedExperienceItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @IsEnum(['WORK', 'PROJECT', 'ACTIVITY', 'EDUCATION'])
  type!: 'WORK' | 'PROJECT' | 'ACTIVITY' | 'EDUCATION';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyName?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  situation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  task?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  result?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resultMetric?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ConfirmOnboardingDto {
  @IsString()
  @MinLength(1)
  parseId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ParsedExperienceItemDto)
  experiences!: ParsedExperienceItemDto[];
}
