import { IsString, IsOptional, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SectionContentDto {
  @IsString()
  heading!: string;

  @IsString()
  body!: string;
}

export class UpdateSectionDto {
  @ValidateNested()
  @Type(() => SectionContentDto)
  content!: SectionContentDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
