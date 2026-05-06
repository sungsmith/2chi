import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class ParseJobPostingDto {
  @IsString()
  @MinLength(10, { message: '공고 내용을 입력하세요.' })
  @MaxLength(100_000, { message: '공고 내용이 너무 깁니다.' })
  text!: string;

  @IsOptional()
  @IsString()
  url?: string;
}
