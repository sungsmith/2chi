import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(1, '기업명을 입력하세요.').max(100),
  industry: z.string().max(50).optional(),
});

export const analyzeCompanySchema = z.object({
  name: z.string().min(1, '기업명을 입력하세요.').max(100),
  jobTitle: z.string().max(100).optional(),
  additionalContext: z.string().max(1000).optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type AnalyzeCompanyInput = z.infer<typeof analyzeCompanySchema>;
