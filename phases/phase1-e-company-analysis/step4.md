# Step 4: company-hooks

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/web/hooks/use-experiences.ts`
- `apps/web/hooks/use-cover-letters.ts`
- `apps/web/lib/api.ts`
- `packages/shared/src/types/company.ts`
- `packages/shared/src/schemas/company.schema.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

기업 분석 및 역량 매칭도 계산을 위한 TanStack Query 훅을 구현한다.

**생성할 파일:**
- `apps/web/hooks/use-companies.ts`

### Step 1: use-companies.ts 구현

`apps/web/hooks/use-companies.ts`:
```typescript
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
```

### Step 2: 타입 체크

```bash
cd apps/web && pnpm tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음 (또는 이 파일과 무관한 기존 에러만).

### Step 3: 커밋

```bash
git add apps/web/hooks/use-companies.ts
git commit -m "feat(web): add company and matching score query hooks"
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
   - packages/shared 타입을 사용하고 있는가? (CompanyDto, AnalyzeCompanyInput, MatchingScoreDto)
3. 결과에 따라 `phases/phase1-e-company-analysis/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- `apps/web` 또는 `apps/api` 내에서 Company 관련 타입을 독자적으로 재정의하지 마라 — 반드시 `@2chi/shared`의 타입을 사용한다
