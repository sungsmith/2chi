import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateCoverLetterDto {
  @IsString()
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  jobPostingId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}
