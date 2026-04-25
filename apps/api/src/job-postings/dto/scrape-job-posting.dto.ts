import { IsUrl } from 'class-validator';

export class ScrapeJobPostingDto {
  @IsUrl({}, { message: '올바른 URL을 입력하세요.' })
  url!: string;
}
