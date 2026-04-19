import { IsString, IsEnum, IsOptional, IsBoolean, MaxLength, IsArray } from 'class-validator';

export class UpdateExperienceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsEnum(['WORK', 'PROJECT', 'ACTIVITY', 'EDUCATION'])
  type?: 'WORK' | 'PROJECT' | 'ACTIVITY' | 'EDUCATION';

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
  @IsBoolean()
  isCurrent?: boolean;

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
  @MaxLength(200)
  resultMetric?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagNames?: string[];
}
