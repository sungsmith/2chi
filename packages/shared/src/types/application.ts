export type ApplicationStage =
  | 'DOCUMENT'
  | 'FIRST_INTERVIEW'
  | 'SECOND_INTERVIEW'
  | 'OFFER'
  | 'DONE'
  | 'CUSTOM';

export type ApplicationResult = 'PASS' | 'FAIL' | 'PENDING' | 'WITHDRAWN';
export type EventType = 'DEADLINE' | 'INTERVIEW' | 'OTHER';

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  DOCUMENT: '서류',
  FIRST_INTERVIEW: '1차 면접',
  SECOND_INTERVIEW: '2차 면접',
  OFFER: '합격통보',
  DONE: '완료',
  CUSTOM: '기타',
};

export const STAGE_DATE_LABELS: Record<ApplicationStage, string> = {
  DOCUMENT: '마감일',
  FIRST_INTERVIEW: '면접일',
  SECOND_INTERVIEW: '면접일',
  OFFER: '통보일',
  DONE: '완료일',
  CUSTOM: '응시일',
};

export const STAGE_COLORS: Record<ApplicationStage, { dot: string; badge: string; label: string }> = {
  DOCUMENT: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-600', label: '서류' },
  FIRST_INTERVIEW: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700', label: '1차 면접' },
  SECOND_INTERVIEW: { dot: 'bg-blue-600', badge: 'bg-blue-100 text-blue-800', label: '2차 면접' },
  OFFER: { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700', label: '합격통보' },
  DONE: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600', label: '완료' },
  CUSTOM: { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700', label: '기타' },
};

export const RESULT_LABELS: Record<ApplicationResult, string> = {
  PASS: '합격',
  FAIL: '불합격',
  PENDING: '대기',
  WITHDRAWN: '포기',
};

export const RESULT_COLORS: Record<ApplicationResult, string> = {
  PASS: 'text-green-600 bg-green-50',
  FAIL: 'text-red-500 bg-red-50',
  PENDING: 'text-amber-600 bg-amber-50',
  WITHDRAWN: 'text-slate-500 bg-slate-100',
};

export interface ApplicationStageHistoryDto {
  id: string;
  applicationId: string;
  stage: ApplicationStage;
  customLabel: string | null;
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
