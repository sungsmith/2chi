export type CoverLetterStatus = 'DRAFT' | 'EDITING' | 'DONE';

export interface CoverLetterItemDto {
  id: string;
  coverLetterId: string;
  question: string;
  order: number;
  charLimit: number | null;
  aiDraft: string | null;
  userContent: string | null;
  feedback: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoverLetterDto {
  id: string;
  userId: string;
  jobPostingId: string | null;
  companyId: string | null;
  title: string;
  matchingScore: number | null;
  status: CoverLetterStatus;
  createdAt: string;
  updatedAt: string;
  items?: CoverLetterItemDto[];
}

export interface JobPostingDto {
  id: string;
  userId: string;
  companyId: string | null;
  url: string | null;
  title: string;
  department: string | null;
  deadline: string | null;
  requiredCompetencies: string[];
  preferredCompetencies: string[];
  requirements: string | null;
  createdAt: string;
}

export interface CompetencyGapDto {
  required: string[];
  preferred: string[];
  myMatched: string[];
  myMissing: string[];
  score: number;
  summary: string;
}
