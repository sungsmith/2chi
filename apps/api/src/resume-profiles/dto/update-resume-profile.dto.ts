import { IsString, IsArray, MinLength, MaxLength, ArrayMinSize, IsOptional } from 'class-validator';

export class UpdateResumeProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: '최소 1개 이상의 경험을 선택해야 합니다' })
  @IsString({ each: true })
  selectedExperienceIds?: string[];
}
