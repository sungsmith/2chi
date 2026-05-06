import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AnalyticsSummaryDto } from '@2chi/shared';

export function useAnalyticsSummary() {
  return useQuery<AnalyticsSummaryDto>({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const res = await api.get<AnalyticsSummaryDto>('/analytics/summary');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
