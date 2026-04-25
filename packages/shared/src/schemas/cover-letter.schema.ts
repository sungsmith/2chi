import { z } from 'zod';

export const parseJobPostingSchema = z.object({
  text: z.string().min(10, '공고 내용을 입력하세요.'),
  url: z.string().url().optional(),
});

export const scrapeJobPostingSchema = z.object({
  url: z.string().url('올바른 URL을 입력하세요.'),
});

export type ParseJobPostingInput = z.infer<typeof parseJobPostingSchema>;
export type ScrapeJobPostingInput = z.infer<typeof scrapeJobPostingSchema>;

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
