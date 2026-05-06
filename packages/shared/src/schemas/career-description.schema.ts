import { z } from 'zod';

export const createCareerDescriptionSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(100),
  versionLabel: z.string().max(50).optional(),
  targetJobType: z.string().max(100).optional(),
});

export const updateCareerDescriptionSchema = createCareerDescriptionSchema.partial();

export const updateSectionSchema = z.object({
  content: z.object({
    heading: z.string(),
    body: z.string(),
  }),
  order: z.number().int().min(0).optional(),
});

export const generateSectionDraftSchema = z.object({
  experienceIds: z.array(z.string()).optional(),
  targetJobType: z.string().optional(),
});

export type CreateCareerDescriptionInput = z.infer<typeof createCareerDescriptionSchema>;
export type UpdateCareerDescriptionInput = z.infer<typeof updateCareerDescriptionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type GenerateSectionDraftInput = z.infer<typeof generateSectionDraftSchema>;
