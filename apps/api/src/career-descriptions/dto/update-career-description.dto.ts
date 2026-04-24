import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateCareerDescriptionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  versionLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetJobType?: string;
}
