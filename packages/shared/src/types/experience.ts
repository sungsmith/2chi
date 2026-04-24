export type ExperienceType = 'WORK' | 'PROJECT' | 'ACTIVITY' | 'EDUCATION';

export interface TagDto {
  id: string;
  name: string;
  category: string | null;
}

export interface ExperienceDto {
  id: string;
  userId: string;
  title: string;
  type: ExperienceType;
  companyName: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
  resultMetric: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Array<{ tag: TagDto }>;
}
