import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CompanyDto, MatchingScoreDto, AnalyzeCompanyInput } from '@2chi/shared';

const CO_KEY = ['companies'] as const;

export function useCompanies() {
  return useQuery({
    queryKey: CO_KEY,
    queryFn: async () => {
      const res = await api.get<CompanyDto[]>('/companies');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: [...CO_KEY, id],
    queryFn: async () => {
      const res = await api.get<CompanyDto>(`/companies/${id}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useAnalyzeCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AnalyzeCompanyInput) => api.post<CompanyDto>('/companies/analyze', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CO_KEY }),
  });
}

export function useMatchingScore(coverLetterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.get<MatchingScoreDto>(`/cover-letters/${coverLetterId}/matching`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cover-letters', coverLetterId] }),
  });
}
