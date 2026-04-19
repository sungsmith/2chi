export type ApplicationStage =
  | 'DOCUMENT'
  | 'FIRST_INTERVIEW'
  | 'SECOND_INTERVIEW'
  | 'FINAL_INTERVIEW'
  | 'OFFER'
  | 'DONE';

export type ApplicationResult = 'PASS' | 'FAIL' | 'PENDING' | 'WITHDRAWN';
export type EventType = 'DEADLINE' | 'INTERVIEW' | 'OTHER';

export interface ApplicationStageHistoryDto {
  id: string;
  applicationId: string;
  stage: ApplicationStage;
  scheduledAt: string | null;
  result: ApplicationResult | null;
  note: string | null;
  createdAt: string;
}

export interface ApplicationDto {
  id: string;
  userId: string;
  jobPostingId: string | null;
  companyId: string | null;
  coverLetterId: string | null;
  careerDescriptionId: string | null;
  appliedAt: string | null;
  currentStage: ApplicationStage;
  result: ApplicationResult | null;
  memo: string | null;
  stages: ApplicationStageHistoryDto[];
  company: { id: string; name: string } | null;
  jobPosting: { id: string; title: string; deadline: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventDto {
  id: string;
  userId: string;
  applicationId: string | null;
  title: string;
  eventType: EventType;
  scheduledAt: string;
  reminderAt: string | null;
  isNotified: boolean;
  createdAt: string;
}
