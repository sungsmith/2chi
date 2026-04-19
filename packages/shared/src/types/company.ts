export interface CompanyOfficialInfo {
  summary: string;
  products: string[];
  recentNews: string[];
}

export interface CompanyDto {
  id: string;
  userId: string;
  name: string;
  industry: string | null;
  officialInfo: CompanyOfficialInfo | null;
  unofficialInfo: Record<string, unknown> | null;
  keyCompetencies: string[];
  analyzedAt: string | null;
  createdAt: string;
}

export interface MatchingScoreDto {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  summary: string;
}
