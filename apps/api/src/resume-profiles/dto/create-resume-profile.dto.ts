import { IsString, IsArray, IsOptional, MinLength, MaxLength, ArrayMinSize } from 'class-validator';

export class CreateResumeProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description: string = '';

  @IsArray()
  @ArrayMinSize(1, { message: '최소 1개 이상의 경험을 선택해야 합니다' })
  @IsString({ each: true })
  selectedExperienceIds!: string[];
}
