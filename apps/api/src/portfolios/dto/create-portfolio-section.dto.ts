import { IsString, IsEnum, MinLength, MaxLength, IsInt, Min } from 'class-validator';

export class CreatePortfolioSectionDto {
  @IsEnum(['INTRO', 'PROJECT', 'SKILLS', 'ACHIEVEMENT', 'CUSTOM'])
  type!: 'INTRO' | 'PROJECT' | 'SKILLS' | 'ACHIEVEMENT' | 'CUSTOM';

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @IsString()
  content!: string;

  @IsInt()
  @Min(0)
  order!: number;
}
