import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class AnalyzeCompanyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalContext?: string;
}
