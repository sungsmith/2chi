import { IsInt, Min, Max, IsOptional, IsArray, IsIn } from 'class-validator';

export class GenerateQuestionsDto {
  @IsInt()
  @Min(3)
  @Max(20)
  count: number = 10;

  @IsOptional()
  @IsArray()
  @IsIn(['COMPETENCY', 'BEHAVIORAL', 'TECHNICAL', 'SITUATIONAL'], { each: true })
  questionTypes?: string[];
}
