'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function usePortfolioSectionDraft(portfolioId: string, sectionId: string) {
  const [stream, setStream] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (): Promise<void> => {
    if (isStreaming) return;

    abortRef.current = new AbortController();
    setIsStreaming(true);
    setError(null);
    setStream('');

    try {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(
        `${API_BASE}/portfolios/${portfolioId}/sections/${sectionId}/draft`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({}),
          signal: abortRef.current.signal,
        },
      );

      if (!res.ok || !res.body) {
        setError('스트리밍 요청이 실패했습니다.');
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.error) {
              setError(parsed.message ?? '생성 중 오류가 발생했습니다.');
              setIsStreaming(false);
              return;
            }
            if (parsed.done) {
              setIsStreaming(false);
              return;
            }
            if (parsed.delta) {
              accumulated += parsed.delta;
              setStream(accumulated);
            }
          } catch {
            // 파싱 실패한 청크 무시
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [portfolioId, sectionId, isStreaming]);

  const reset = useCallback((): void => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStream('');
    setIsStreaming(false);
    setError(null);
  }, []);

  return { stream, isStreaming, error, startStream, reset };
}
