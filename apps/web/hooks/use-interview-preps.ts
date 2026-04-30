import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  InterviewPrepDto,
  InterviewAnswerDto,
  CreateInterviewPrepInput,
  GenerateQuestionsInput,
  SaveAnswerInput,
} from '@2chi/shared';

const INTERVIEW_PREP_KEY = ['interview-preps'] as const;

export function useInterviewPreps() {
  return useQuery({
    queryKey: INTERVIEW_PREP_KEY,
    queryFn: async () => {
      const res = await api.get<InterviewPrepDto[]>('/interview-preps');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useInterviewPrep(id: string) {
  return useQuery({
    queryKey: [...INTERVIEW_PREP_KEY, id],
    queryFn: async () => {
      const res = await api.get<InterviewPrepDto>(`/interview-preps/${id}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateInterviewPrep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateInterviewPrepInput) => {
      const res = await api.post<InterviewPrepDto>('/interview-preps', data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: INTERVIEW_PREP_KEY }),
  });
}

export function useDeleteInterviewPrep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/interview-preps/${id}`);
      if (!res.success) throw new Error(res.error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INTERVIEW_PREP_KEY });
      qc.refetchQueries({ queryKey: INTERVIEW_PREP_KEY });
    },
  });
}

export function useGenerateQuestions(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: GenerateQuestionsInput) => {
      const res = await api.post<{ jobId: string }>(`/interview-preps/${id}/generate-questions`, data);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...INTERVIEW_PREP_KEY, id] }),
  });
}

export function useSaveAnswer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ answerId, ...data }: { answerId: string } & SaveAnswerInput) => {
      const res = await api.patch<InterviewAnswerDto>(
        `/interview-preps/${id}/answers/${answerId}`,
        data,
      );
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...INTERVIEW_PREP_KEY, id] }),
  });
}

export function useRequestFeedback(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (answerId: string) => {
      const res = await api.post<{ jobId: string }>(
        `/interview-preps/${id}/answers/${answerId}/feedback`,
        {},
      );
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...INTERVIEW_PREP_KEY, id] }),
  });
}
