import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateCoverLetterItemDto {
  @IsString()
  question!: string;

  @IsInt()
  @Min(0)
  order!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  charLimit?: number;
}
