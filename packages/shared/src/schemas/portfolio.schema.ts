import { z } from 'zod';

export const CreatePortfolioSchema = z.object({
  title: z.string().min(1).max(100),
  templateId: z.string().min(1),
  versionLabel: z.string().min(1).max(50),
});

export const UpdatePortfolioSchema = CreatePortfolioSchema.partial();

export const CreatePortfolioSectionSchema = z.object({
  type: z.enum(['INTRO', 'PROJECT', 'SKILLS', 'ACHIEVEMENT', 'CUSTOM']),
  title: z.string().min(1).max(100),
  content: z.string(),
  order: z.number().int().min(0),
});

export const UpdatePortfolioSectionSchema = CreatePortfolioSectionSchema.partial();

export type CreatePortfolioInput = z.infer<typeof CreatePortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof UpdatePortfolioSchema>;
export type CreatePortfolioSectionInput = z.infer<typeof CreatePortfolioSectionSchema>;
export type UpdatePortfolioSectionInput = z.infer<typeof UpdatePortfolioSectionSchema>;
