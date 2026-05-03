import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CompanyDto, MatchingScoreDto, AnalyzeCompanyInput, CompetencyGapDto } from '@2chi/shared';

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

type AnalyzeResult =
  | { cached: true; company: CompanyDto }
  | { cached: false; jobId: string };

export function useAnalyzeCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: AnalyzeCompanyInput): Promise<AnalyzeResult> => {
      const res = await api.post<AnalyzeResult>('/companies/analyze', data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CO_KEY }),
  });
}

/**
 * 기업 분석 Bull Queue 작업 상태 폴링.
 * completed / failed 가 되면 폴링 중단 후 companies 쿼리 갱신.
 */
export function useCompanyJobStatus(jobId: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: [...CO_KEY, 'job', jobId],
    queryFn: async () => {
      const res = await api.get<{ status: string; progress?: number }>(
        `/companies/jobs/${jobId}`,
      );
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') {
        qc.invalidateQueries({ queryKey: CO_KEY });
        return false;
      }
      return 2000;
    },
  });
}

export function useMatchingScore(coverLetterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.get<MatchingScoreDto>(`/cover-letters/${coverLetterId}/matching`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cover-letters', coverLetterId] }),
  });
}

export function useCompetencyGapAnalysis() {
  return useMutation({
    mutationFn: async ({ companyId, jobPostingId }: { companyId: string; jobPostingId: string }) => {
      const res = await api.post<CompetencyGapDto>(`/companies/${companyId}/gap-analysis`, { jobPostingId });
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}
