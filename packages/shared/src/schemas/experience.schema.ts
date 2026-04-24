import { z } from 'zod';

export const createExperienceSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(100),
  type: z.enum(['WORK', 'PROJECT', 'ACTIVITY', 'EDUCATION']),
  companyName: z.string().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
  situation: z.string().max(2000).optional(),
  task: z.string().max(2000).optional(),
  action: z.string().max(2000).optional(),
  result: z.string().max(2000).optional(),
  resultMetric: z.string().max(200).optional(),
  tagNames: z.array(z.string()).optional(),
});

export const updateExperienceSchema = createExperienceSchema.partial();

export type CreateExperienceInput = z.infer<typeof createExperienceSchema>;
export type UpdateExperienceInput = z.infer<typeof updateExperienceSchema>;
