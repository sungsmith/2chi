import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ApplicationDto,
  ApplicationStageHistoryDto,
  ApplicationResult,
  CreateApplicationInput,
  AddStageInput,
  UpdateStageInput,
} from '@2chi/shared';

const APP_KEY = ['applications'] as const;

export function useApplications() {
  return useQuery({
    queryKey: APP_KEY,
    queryFn: async () => {
      const res = await api.get<ApplicationDto[]>('/applications');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateApplicationInput) => api.post<ApplicationDto>('/applications', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}

export function useUpdateApplication(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateApplicationInput> & { result?: ApplicationResult }) =>
      api.patch<ApplicationDto>(`/applications/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/applications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}

export function useAddStage(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddStageInput) =>
      api.post<ApplicationStageHistoryDto>(`/applications/${applicationId}/stages`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}

export function useCustomStageLabels() {
  return useQuery({
    queryKey: ['applications', 'stages', 'custom-labels'],
    queryFn: async () => {
      const res = await api.get<string[]>('/applications/stages/custom-labels');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useUpdateStage(applicationId: string, stageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateStageInput) =>
      api.patch<ApplicationStageHistoryDto>(`/applications/${applicationId}/stages/${stageId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}
