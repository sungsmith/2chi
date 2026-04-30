import { z } from 'zod';

export const CreateResumeProfileSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).default(''),
  selectedExperienceIds: z.array(z.string()).min(1, '최소 1개 이상의 경험을 선택해야 합니다'),
});

export const UpdateResumeProfileSchema = CreateResumeProfileSchema.partial();

export type CreateResumeProfileInput = z.infer<typeof CreateResumeProfileSchema>;
export type UpdateResumeProfileInput = z.infer<typeof UpdateResumeProfileSchema>;
