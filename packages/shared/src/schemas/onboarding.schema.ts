import { z } from 'zod';

export const confirmOnboardingSchema = z.object({
  parseId: z.string().min(1),
  experiences: z.array(z.object({
    title: z.string().min(1, '제목을 입력하세요.').max(100),
    type: z.enum(['WORK', 'PROJECT', 'ACTIVITY', 'EDUCATION']),
    companyName: z.string().max(100).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    situation: z.string().max(2000).optional(),
    task: z.string().max(2000).optional(),
    action: z.string().max(2000).optional(),
    result: z.string().max(2000).optional(),
    resultMetric: z.string().max(500).optional(),
    tags: z.array(z.string()).optional(),
  })).min(1, '저장할 경험을 1개 이상 선택하세요.'),
});

export type ConfirmOnboardingInput = z.infer<typeof confirmOnboardingSchema>;
