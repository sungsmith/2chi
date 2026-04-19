import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CoverLetterDto, CreateCoverLetterInput, CreateCoverLetterItemInput } from '@2chi/shared';

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

export function useCoverLetter(id: string) {
  return useQuery({
    queryKey: [...CL_KEY, id],
    queryFn: async () => {
      const res = await api.get<CoverLetterDto>(`/cover-letters/${id}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCoverLetterInput) =>
      api.post<CoverLetterDto>('/cover-letters', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CL_KEY }),
  });
}

export function useDeleteCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cover-letters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: CL_KEY }),
  });
}

export function useAddCoverLetterItem(coverLetterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCoverLetterItemInput) =>
      api.post(`/cover-letters/${coverLetterId}/items`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CL_KEY, coverLetterId] }),
  });
}

export function useRequestMatching(coverLetterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/cover-letters/${coverLetterId}/matching`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CL_KEY, coverLetterId] }),
  });
}
