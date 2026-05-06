import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateInterviewPrepDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  jobPostingId?: string;
}
