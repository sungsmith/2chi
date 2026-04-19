import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface CoverLetterDto {
  id: string;
  title: string;
  companyName: string;
  createdAt: string;
  updatedAt: string;
}

const CL_KEY = ['cover-letters'] as const;

export function useCoverLetters() {
  return useQuery({
    queryKey: CL_KEY,
    queryFn: async () => {
      const res = await api.get<CoverLetterDto[]>('/cover-letters');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}
