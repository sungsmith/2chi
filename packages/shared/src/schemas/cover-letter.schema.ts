import { z } from 'zod';

export const createCoverLetterSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(100),
  jobPostingId: z.string().optional(),
  companyId: z.string().optional(),
});

export const createCoverLetterItemSchema = z.object({
  question: z.string().min(1, '질문을 입력하세요.'),
  order: z.number().int().min(0),
  charLimit: z.number().int().min(1).optional(),
});

export const updateCoverLetterItemSchema = z.object({
  userContent: z.string().optional(),
  charLimit: z.number().int().min(1).optional(),
});

export type CreateCoverLetterInput = z.infer<typeof createCoverLetterSchema>;
export type CreateCoverLetterItemInput = z.infer<typeof createCoverLetterItemSchema>;
export type UpdateCoverLetterItemInput = z.infer<typeof updateCoverLetterItemSchema>;
