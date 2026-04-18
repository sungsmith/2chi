# Step 3: applications-calendar-hooks

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/web/lib/api.ts`
- `apps/web/hooks/use-experiences.ts`
- `packages/shared/src/types/application.ts`
- `packages/shared/src/schemas/application.schema.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

프론트엔드에서 Applications API와 Calendar API를 호출하는 TanStack Query 훅들을 구현한다.

**생성할 파일:**
- `apps/web/hooks/use-applications.ts`
- `apps/web/hooks/use-calendar.ts`

### Step 1: use-applications.ts 구현

`apps/web/hooks/use-applications.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ApplicationDto, ApplicationStageHistoryDto,
  CreateApplicationInput, AddStageInput
} from '@2chi/shared';

const APP_KEY = ['applications'] as const;

export function useApplications() {
  return useQuery({
    queryKey: APP_KEY,
    queryFn: async () => {
      const res = await api.get<ApplicationDto[]>('/applications');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateApplicationInput) => api.post<ApplicationDto>('/applications', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}

export function useUpdateApplication(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateApplicationInput> & { result?: string }) =>
      api.patch<ApplicationDto>(`/applications/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/applications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}

export function useAddStage(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddStageInput) =>
      api.post<ApplicationStageHistoryDto>(`/applications/${applicationId}/stages`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: APP_KEY }),
  });
}
```

### Step 2: use-calendar.ts 구현

`apps/web/hooks/use-calendar.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CalendarEventDto, CreateCalendarEventInput } from '@2chi/shared';

export function useCalendarEvents(year: number, month: number) {
  return useQuery({
    queryKey: ['calendar', year, month],
    queryFn: async () => {
      const res = await api.get<CalendarEventDto[]>(`/calendar?year=${year}&month=${month}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useCreateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCalendarEventInput) => api.post<CalendarEventDto>('/calendar', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  });
}

export function useDeleteCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/calendar/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar'] }),
  });
}
```

### Step 3: 커밋

```bash
git add apps/web/hooks/use-applications.ts apps/web/hooks/use-calendar.ts
git commit -m "feat(web): add applications and calendar query hooks"
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
3. 결과에 따라 `phases/phase1-d-applications-calendar/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- packages/shared의 타입(ApplicationDto, CalendarEventDto 등)을 재정의하지 마라
