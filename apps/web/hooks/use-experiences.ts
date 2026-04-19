import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ExperienceDto {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  createdAt: string;
  updatedAt: string;
}

const EXP_KEY = ['experiences'] as const;

export function useExperiences() {
  return useQuery({
    queryKey: EXP_KEY,
    queryFn: async () => {
      const res = await api.get<ExperienceDto[]>('/experiences');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}
