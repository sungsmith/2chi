import { ExperienceType } from './experience';

export interface ParsedExperience {
  title: string;
  type: ExperienceType;
  companyName?: string;
  startDate?: string;
  endDate?: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  resultMetric?: string;
  tags?: string[];
}

export interface OnboardingParseResultDto {
  parseId: string;
  experiences: ParsedExperience[];
  confidence: number;
}
