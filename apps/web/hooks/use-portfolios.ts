'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  PortfolioDto,
  PortfolioSectionDto,
  CreatePortfolioInput,
  UpdatePortfolioInput,
  CreatePortfolioSectionInput,
  UpdatePortfolioSectionInput,
} from '@2chi/shared';

const PORTFOLIO_KEY = ['portfolios'] as const;

export function usePortfolios() {
  return useQuery({
    queryKey: PORTFOLIO_KEY,
    queryFn: async () => {
      const res = await api.get<PortfolioDto[]>('/portfolios');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function usePortfolio(id: string) {
  return useQuery({
    queryKey: [...PORTFOLIO_KEY, id],
    queryFn: async () => {
      const res = await api.get<PortfolioDto>(`/portfolios/${id}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePortfolioInput) => {
      const res = await api.post<PortfolioDto>('/portfolios', data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PORTFOLIO_KEY }),
  });
}

export function useUpdatePortfolio(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdatePortfolioInput) => {
      const res = await api.patch<PortfolioDto>(`/portfolios/${id}`, data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...PORTFOLIO_KEY, id] });
      qc.invalidateQueries({ queryKey: PORTFOLIO_KEY });
    },
  });
}

export function useDeletePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/portfolios/${id}`);
      if (!res.success) throw new Error(res.error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PORTFOLIO_KEY });
      qc.refetchQueries({ queryKey: PORTFOLIO_KEY });
    },
  });
}

export function useCreateSection(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePortfolioSectionInput) => {
      const res = await api.post<PortfolioSectionDto>(`/portfolios/${portfolioId}/sections`, data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PORTFOLIO_KEY }),
  });
}

export function useUpdateSection(portfolioId: string, sectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdatePortfolioSectionInput) => {
      const res = await api.patch<PortfolioSectionDto>(
        `/portfolios/${portfolioId}/sections/${sectionId}`,
        data,
      );
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...PORTFOLIO_KEY, portfolioId] }),
  });
}

export function useDeleteSection(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sectionId: string) => {
      const res = await api.delete(`/portfolios/${portfolioId}/sections/${sectionId}`);
      if (!res.success) throw new Error(res.error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PORTFOLIO_KEY }),
  });
}

export function useReorderSections(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sectionIds: string[]) => {
      const res = await api.put<null>(`/portfolios/${portfolioId}/sections/reorder`, { sectionIds });
      if (!res.success) throw new Error(res.error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...PORTFOLIO_KEY, portfolioId] }),
  });
}

export function useGeneratePortfolioPdf(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ jobId: string }> => {
      const res = await api.post<{ jobId: string }>(`/portfolios/${portfolioId}/pdf`, {});
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      // 포트폴리오 데이터를 폴링하여 pdfUrl이 채워지면 최신 상태로 갱신
      qc.invalidateQueries({ queryKey: [...PORTFOLIO_KEY, portfolioId] });
    },
  });
}

export function usePortfolioPdfUrl(portfolioId: string) {
  return useMutation({
    mutationFn: async (): Promise<{ url: string | null }> => {
      const res = await api.get<{ url: string | null }>(`/portfolios/${portfolioId}/pdf-url`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}
