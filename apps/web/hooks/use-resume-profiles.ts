import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ResumeProfileDto,
  CreateResumeProfileInput,
  UpdateResumeProfileInput,
} from '@2chi/shared';

const RESUME_PROFILE_KEY = ['resume-profiles'] as const;

export function useResumeProfiles() {
  return useQuery({
    queryKey: RESUME_PROFILE_KEY,
    queryFn: async () => {
      const res = await api.get<ResumeProfileDto[]>('/resume-profiles');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useResumeProfile(id: string) {
  return useQuery({
    queryKey: [...RESUME_PROFILE_KEY, id],
    queryFn: async () => {
      const res = await api.get<ResumeProfileDto>(`/resume-profiles/${id}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateResumeProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateResumeProfileInput) => {
      const res = await api.post<ResumeProfileDto>('/resume-profiles', data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RESUME_PROFILE_KEY }),
  });
}

export function useUpdateResumeProfile(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateResumeProfileInput) => {
      const res = await api.patch<ResumeProfileDto>(`/resume-profiles/${id}`, data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...RESUME_PROFILE_KEY, id] });
      qc.invalidateQueries({ queryKey: RESUME_PROFILE_KEY });
    },
  });
}

export function useDeleteResumeProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/resume-profiles/${id}`);
      if (!res.success) throw new Error(res.error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESUME_PROFILE_KEY });
      qc.refetchQueries({ queryKey: RESUME_PROFILE_KEY });
    },
  });
}
