import { z } from 'zod';

export const CreateInterviewPrepSchema = z.object({
  title: z.string().min(1).max(100),
  jobPostingId: z.string().optional(),
});

export const GenerateQuestionsSchema = z.object({
  count: z.number().int().min(3).max(20).default(10),
  questionTypes: z.array(z.enum(['COMPETENCY', 'BEHAVIORAL', 'TECHNICAL', 'SITUATIONAL'])).optional(),
});

export const SaveAnswerSchema = z.object({
  answer: z.string().min(1),
});

export type CreateInterviewPrepInput = z.infer<typeof CreateInterviewPrepSchema>;
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsSchema>;
export type SaveAnswerInput = z.infer<typeof SaveAnswerSchema>;
