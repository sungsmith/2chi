import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { JobPostingDto, ScrapeJobPostingInput, ParseJobPostingInput } from '@2chi/shared';

const JP_KEY = ['job-postings'] as const;

export function useJobPostings() {
  return useQuery({
    queryKey: JP_KEY,
    queryFn: async () => {
      const res = await api.get<JobPostingDto[]>('/job-postings');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useJobPosting(id: string) {
  return useQuery({
    queryKey: [...JP_KEY, id],
    queryFn: async () => {
      const res = await api.get<JobPostingDto>(`/job-postings/${id}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useScrapeJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ScrapeJobPostingInput) => {
      const res = await api.post<JobPostingDto>('/job-postings/scrape', data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: JP_KEY }),
  });
}

export function useParseJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ParseJobPostingInput) => {
      const res = await api.post<JobPostingDto>('/job-postings/parse', data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: JP_KEY }),
  });
}

export function useDeleteJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/job-postings/${id}`);
      if (!res.success) throw new Error(res.error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JP_KEY });
      qc.refetchQueries({ queryKey: JP_KEY });
    },
  });
}
