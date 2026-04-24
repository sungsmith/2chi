import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ExperienceDto, CreateExperienceInput, UpdateExperienceInput } from '@2chi/shared';

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

export function useExperience(id: string) {
  return useQuery({
    queryKey: [...EXP_KEY, id],
    queryFn: async () => {
      const res = await api.get<ExperienceDto>(`/experiences/${id}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateExperienceInput) => {
      const res = await api.post<ExperienceDto>('/experiences', data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: EXP_KEY }),
  });
}

export function useUpdateExperience(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateExperienceInput) => {
      const res = await api.patch<ExperienceDto>(`/experiences/${id}`, data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: EXP_KEY }),
  });
}

export function useDeleteExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/experiences/${id}`);
      if (!res.success) throw new Error(res.error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: EXP_KEY }),
  });
}
