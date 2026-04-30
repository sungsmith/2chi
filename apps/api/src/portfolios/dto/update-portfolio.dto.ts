import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdatePortfolioDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  templateId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  versionLabel?: string;
}
