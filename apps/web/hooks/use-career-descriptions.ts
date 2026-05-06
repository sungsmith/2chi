import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CareerDescriptionDto,
  CareerDescriptionSectionDto,
  CreateCareerDescriptionInput,
  UpdateCareerDescriptionInput,
  UpdateSectionInput,
} from '@2chi/shared';

const CD_KEY = ['career-descriptions'] as const;

export function useCareerDescriptions() {
  return useQuery({
    queryKey: CD_KEY,
    queryFn: async () => {
      const res = await api.get<CareerDescriptionDto[]>('/career-descriptions');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useCareerDescription(id: string) {
  return useQuery({
    queryKey: [...CD_KEY, id],
    queryFn: async () => {
      const res = await api.get<CareerDescriptionDto>(`/career-descriptions/${id}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateCareerDescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCareerDescriptionInput) => {
      const res = await api.post<CareerDescriptionDto>('/career-descriptions', data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CD_KEY }),
  });
}

export function useUpdateCareerDescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCareerDescriptionInput }) => {
      const res = await api.patch<CareerDescriptionDto>(`/career-descriptions/${id}`, data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: [...CD_KEY, variables.id] });
      qc.invalidateQueries({ queryKey: CD_KEY });
    },
  });
}

export function useDeleteCareerDescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/career-descriptions/${id}`);
      if (!res.success) throw new Error(res.error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CD_KEY });
      qc.refetchQueries({ queryKey: CD_KEY });
    },
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      careerDescriptionId,
      sectionId,
      data,
    }: {
      careerDescriptionId: string;
      sectionId: string;
      data: UpdateSectionInput;
    }) => {
      const res = await api.patch<CareerDescriptionSectionDto>(
        `/career-descriptions/${careerDescriptionId}/sections/${sectionId}`,
        data,
      );
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: [...CD_KEY, variables.careerDescriptionId] });
    },
  });
}

export function useGeneratePdf() {
  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const res = await api.post<{ url: string }>(`/career-descriptions/${id}/pdf`, {});
      if (!res.success) throw new Error(res.error.message);
      return res.data.url;
    },
    // Signed URL은 1시간 후 만료되므로 캐시에 저장하지 않는다
  });
}
