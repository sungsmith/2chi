import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import type { OnboardingParseResultDto, ConfirmOnboardingInput } from '@2chi/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useParseResume() {
  return useMutation({
    mutationFn: async (file: File): Promise<OnboardingParseResultDto> => {
      const token = useAuthStore.getState().accessToken;
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/onboarding/parse`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
        body: formData,
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? '파일 파싱에 실패했습니다.');
      return data.data as OnboardingParseResultDto;
    },
  });
}

export function useConfirmParsed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ConfirmOnboardingInput): Promise<{ createdCount: number; experienceIds: string[] }> => {
      const token = useAuthStore.getState().accessToken;

      const res = await fetch(`${API_BASE}/onboarding/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? '경험 저장에 실패했습니다.');
      return data.data as { createdCount: number; experienceIds: string[] };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['experiences'] }),
  });
}
