import { IsString, MinLength } from 'class-validator';

export class SaveAnswerDto {
  @IsString()
  @MinLength(1)
  answer!: string;
}
