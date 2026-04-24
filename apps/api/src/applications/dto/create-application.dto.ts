import { IsString, IsOptional, IsEnum, IsDateString, MaxLength } from 'class-validator';

export class CreateApplicationDto {
  @IsOptional()
  @IsString()
  jobPostingId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  coverLetterId?: string;

  @IsOptional()
  @IsDateString()
  appliedAt?: string;

  @IsOptional()
  @IsEnum(['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'OFFER', 'DONE', 'CUSTOM'])
  currentStage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  memo?: string;
}
