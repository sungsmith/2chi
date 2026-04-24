'use client';

import { useState, useRef, useCallback } from 'react';
import type { GenerateSectionDraftInput } from '@2chi/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('2chi-auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

export function useSectionDraft(careerDescriptionId: string, sectionId: string) {
  const [stream, setStream] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (input: GenerateSectionDraftInput) => {
      if (isStreaming) return;

      abortRef.current = new AbortController();
      setIsStreaming(true);
      setStream('');

      try {
        const token = getAccessToken();
        const res = await fetch(
          `${API_BASE}/career-descriptions/${careerDescriptionId}/sections/${sectionId}/draft`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(input),
            signal: abortRef.current.signal,
          },
        );

        if (!res.ok || !res.body) {
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
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [careerDescriptionId, sectionId, isStreaming],
  );

  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return { stream, isStreaming, startStream, cancelStream };
}
