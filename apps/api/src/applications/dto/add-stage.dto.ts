import { IsEnum, IsOptional, IsDateString, IsString, MaxLength } from 'class-validator';

export class AddStageDto {
  @IsEnum(['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW', 'OFFER', 'DONE'])
  stage!: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsEnum(['PASS', 'FAIL', 'PENDING', 'WITHDRAWN'])
  result?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
