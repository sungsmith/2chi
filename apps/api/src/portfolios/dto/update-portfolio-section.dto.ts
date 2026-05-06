import { IsString, IsEnum, IsOptional, MinLength, MaxLength, IsInt, Min } from 'class-validator';

export class UpdatePortfolioSectionDto {
  @IsOptional()
  @IsEnum(['INTRO', 'PROJECT', 'SKILLS', 'ACHIEVEMENT', 'CUSTOM'])
  type?: 'INTRO' | 'PROJECT' | 'SKILLS' | 'ACHIEVEMENT' | 'CUSTOM';

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
