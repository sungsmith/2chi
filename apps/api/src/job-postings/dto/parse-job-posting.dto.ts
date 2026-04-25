import { IsString, IsOptional, MinLength } from 'class-validator';

export class ParseJobPostingDto {
  @IsString()
  @MinLength(10, { message: '공고 내용을 입력하세요.' })
  text!: string;

  @IsOptional()
  @IsString()
  url?: string;
}
