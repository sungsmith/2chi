import { z } from 'zod';

export const createApplicationSchema = z.object({
  jobPostingId: z.string().optional(),
  companyId: z.string().optional(),
  coverLetterId: z.string().optional(),
  appliedAt: z.string().optional(),
  currentStage: z
    .enum(['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'OFFER', 'DONE', 'CUSTOM'])
    .optional()
    .default('DOCUMENT'),
  memo: z.string().max(2000).optional(),
});

export const addStageSchema = z.object({
  stage: z.enum(['DOCUMENT', 'FIRST_INTERVIEW', 'SECOND_INTERVIEW', 'OFFER', 'DONE', 'CUSTOM']),
  customLabel: z.string().optional(),
  scheduledAt: z.string().optional(),
  result: z.enum(['PASS', 'FAIL', 'PENDING', 'WITHDRAWN']).optional(),
  note: z.string().max(500).optional(),
});

export const updateStageSchema = z.object({
  result: z.enum(['PASS', 'FAIL', 'PENDING', 'WITHDRAWN']).optional(),
  note: z.string().max(500).optional(),
});

export const createCalendarEventSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(100),
  eventType: z.enum(['DEADLINE', 'INTERVIEW', 'OTHER']),
  scheduledAt: z.string().min(1, '일정 날짜를 입력하세요.'),
  applicationId: z.string().optional(),
  reminderAt: z.string().optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type AddStageInput = z.infer<typeof addStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
