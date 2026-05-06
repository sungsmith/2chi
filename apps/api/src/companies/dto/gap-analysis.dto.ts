import { IsString, IsNotEmpty } from 'class-validator';

export class GapAnalysisDto {
  @IsString()
  @IsNotEmpty()
  jobPostingId!: string;
}
