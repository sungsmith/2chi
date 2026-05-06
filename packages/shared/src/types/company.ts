import type { CompetencyGapDto } from './cover-letter';

export interface CompanyOfficialInfo {
  summary: string;
  products: string[];
  recentNews: string[];
  culture?: string;
}

export interface CompanyJobInfo {
  jobTitle: string;
  requiredCompetencies: string[];
  preferredCompetencies: string[];
  jobSummary: string;
}

export interface CompanyDto {
  id: string;
  userId: string;
  name: string;
  industry: string | null;
  officialInfo: CompanyOfficialInfo | null;
  keyCompetencies: string[];
  jobInfo: CompanyJobInfo | null;
  gapResult: CompetencyGapDto | null;
  analyzedAt: string | null;
  createdAt: string;
}

export interface MatchingScoreDto {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  summary: string;
}
