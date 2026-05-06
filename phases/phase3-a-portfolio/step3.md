# Step 3: portfolio-hooks

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/apps/web/hooks/use-career-descriptions.ts` — TanStack Query 훅 패턴
- `/apps/web/hooks/use-section-draft.ts` — SSE 스트리밍 훅 패턴 (존재하는 경우)
- `/packages/shared/src/types/portfolio.ts` — Step 0에서 생성한 타입
- `/packages/shared/src/schemas/portfolio.schema.ts` — Step 0에서 생성한 스키마

이전 steps 완료 summary:
- Step 0: PortfolioDto, PortfolioSectionDto 타입 및 Zod 스키마 packages/shared에 추가
- Step 1: portfolio.prompt.ts 생성, AiService에 streamPortfolioSectionDraft 메서드 추가
- Step 2: portfolios NestJS 모듈 생성 — CRUD, 섹션 관리, AI SSE 스트리밍, PDF 생성 포함

## 작업

포트폴리오 TanStack Query 훅과 SSE 스트리밍 훅을 생성한다.

### 생성할 파일

**`apps/web/hooks/use-portfolios.ts`**

아래 훅들을 구현한다. 기존 use-career-descriptions.ts 패턴을 따른다.

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PortfolioDto, PortfolioSectionDto, CreatePortfolioInput, UpdatePortfolioInput, CreatePortfolioSectionInput, UpdatePortfolioSectionInput } from '@2chi/shared';

const PORTFOLIO_KEY = ['portfolios'] as const;

export function usePortfolios(): UseQueryResult<PortfolioDto[]>
export function usePortfolio(id: string): UseQueryResult<PortfolioDto>
export function useCreatePortfolio(): UseMutationResult<PortfolioDto, Error, CreatePortfolioInput>
export function useUpdatePortfolio(id: string): UseMutationResult<PortfolioDto, Error, UpdatePortfolioInput>
export function useDeletePortfolio(): UseMutationResult<void, Error, string>

// 섹션 훅
export function useCreateSection(portfolioId: string): UseMutationResult<PortfolioSectionDto, Error, CreatePortfolioSectionInput>
export function useUpdateSection(portfolioId: string, sectionId: string): UseMutationResult<PortfolioSectionDto, Error, UpdatePortfolioSectionInput>
export function useDeleteSection(portfolioId: string): UseMutationResult<void, Error, string>
export function useReorderSections(portfolioId: string): UseMutationResult<void, Error, string[]>

// PDF
export function useGeneratePortfolioPdf(portfolioId: string): UseMutationResult<{ url: string }, Error, void>
```

성공 시 `queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY })`로 캐시 무효화.

**`apps/web/hooks/use-portfolio-section-draft.ts`**

SSE 스트리밍 훅 (TanStack Query 사용하지 않음). 기존 SSE 훅 패턴을 따른다:

```typescript
import { useState } from 'react';

export function usePortfolioSectionDraft(portfolioId: string, sectionId: string) {
  const [stream, setStream] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startStream = async (): Promise<void> => {
    // 1. isStreaming = true, error = null, stream = '' 초기화
    // 2. Authorization 헤더와 함께 POST /portfolios/:id/sections/:sectionId/draft 요청
    // 3. response.body.getReader()로 스트림 읽기
    // 4. 각 청크를 디코딩하여 stream에 누적
    // 5. 완료 시 isStreaming = false
    // 6. 에러 발생 시 error 설정, isStreaming = false
  };

  const reset = (): void => {
    setStream('');
    setIsStreaming(false);
    setError(null);
  };

  return { stream, isStreaming, error, startStream, reset };
}
```

JWT 토큰은 Zustand auth store에서 가져온다 (`useAuthStore.getState().accessToken`).

## Acceptance Criteria

```bash
cd apps/web && pnpm build
# 타입 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - 모든 mutation 성공 시 관련 query가 invalidate되는가?
   - `usePortfolioSectionDraft`가 스트리밍 중/완료/에러 상태를 분리하여 반환하는가?
3. 성공 시 `phases/phase3-a-portfolio/index.json`의 step 3을 업데이트한다:
   - `"status": "completed"`, `"summary": "use-portfolios.ts (TanStack Query 훅), use-portfolio-section-draft.ts (SSE 훅) 생성"`

## 금지사항

- TanStack Query를 SSE 스트리밍에 사용하지 마라. 이유: SSE는 지속적 연결이므로 별도 훅으로 관리해야 한다.
- accessToken을 하드코딩하거나 localStorage에서 직접 읽지 마라. 이유: Zustand auth store를 통해야 한다.
