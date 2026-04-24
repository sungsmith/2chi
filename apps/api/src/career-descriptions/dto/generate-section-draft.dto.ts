import { IsString, IsOptional, IsArray } from 'class-validator';

export class GenerateSectionDraftDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  experienceIds?: string[];

  @IsOptional()
  @IsString()
  targetJobType?: string;
}
