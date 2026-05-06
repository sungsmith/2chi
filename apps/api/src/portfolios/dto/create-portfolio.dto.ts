import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreatePortfolioDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @IsString()
  @MinLength(1)
  templateId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  versionLabel!: string;
}
