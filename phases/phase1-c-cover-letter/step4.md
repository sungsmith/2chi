# Step 4: cover-letter-hooks

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/web/lib/api.ts`
- `apps/web/store/auth.store.ts`
- `apps/web/hooks/use-experiences.ts`
- `packages/shared/src/types/cover-letter.ts`
- `packages/shared/src/schemas/cover-letter.schema.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

프론트엔드에서 CoverLetter API와 JobPosting API를 호출하는 TanStack Query 훅들을 구현한다.

**생성할 파일:**
- `apps/web/hooks/use-cover-letters.ts`
- `apps/web/hooks/use-job-postings.ts`

### Step 1: use-cover-letters.ts 구현

`apps/web/hooks/use-cover-letters.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CoverLetterDto, CoverLetterItemDto,
  CreateCoverLetterInput, AddCoverLetterItemInput, UpdateCoverLetterItemInput
} from '@2chi/shared';

const CL_KEY = ['cover-letters'] as const;

export function useCoverLetters() {
  return useQuery({
    queryKey: CL_KEY,
    queryFn: async () => {
      const res = await api.get<CoverLetterDto[]>('/cover-letters');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useCoverLetter(id: string) {
  return useQuery({
    queryKey: [...CL_KEY, id],
    queryFn: async () => {
      const res = await api.get<CoverLetterDto>(`/cover-letters/${id}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCoverLetterInput) => api.post<CoverLetterDto>('/cover-letters', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CL_KEY }),
  });
}

export function useDeleteCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cover-letters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: CL_KEY }),
  });
}

export function useAddCoverLetterItem(coverLetterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddCoverLetterItemInput) =>
      api.post<CoverLetterItemDto>(`/cover-letters/${coverLetterId}/items`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CL_KEY, coverLetterId] }),
  });
}

export function useUpdateCoverLetterItem(coverLetterId: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCoverLetterItemInput) =>
      api.patch<CoverLetterItemDto>(`/cover-letters/${coverLetterId}/items/${itemId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CL_KEY, coverLetterId] }),
  });
}

export function useGenerateFeedback(coverLetterId: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<CoverLetterItemDto>(`/cover-letters/${coverLetterId}/items/${itemId}/feedback`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CL_KEY, coverLetterId] }),
  });
}
```

### Step 2: use-job-postings.ts 구현

`apps/web/hooks/use-job-postings.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { JobPostingDto, ParseJobPostingInput } from '@2chi/shared';

const JP_KEY = ['job-postings'] as const;

export function useJobPostings() {
  return useQuery({
    queryKey: JP_KEY,
    queryFn: async () => {
      const res = await api.get<JobPostingDto[]>('/job-postings');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useParseJobPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ParseJobPostingInput) => api.post<JobPostingDto>('/job-postings/parse', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: JP_KEY }),
  });
}
```

### Step 3: 커밋

```bash
git add apps/web/hooks/use-cover-letters.ts apps/web/hooks/use-job-postings.ts
git commit -m "feat(web): add cover letter and job posting query hooks"
```

## Acceptance Criteria

```bash
cd apps/web && pnpm lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/phase1-c-cover-letter/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- packages/shared의 타입(CoverLetterDto, JobPostingDto 등)을 재정의하지 마라
