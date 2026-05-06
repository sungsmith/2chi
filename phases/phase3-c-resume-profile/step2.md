# Step 2: resume-profile-hooks

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/apps/web/hooks/use-career-descriptions.ts` — TanStack Query 훅 패턴
- `/packages/shared/src/types/resume-profile.ts` — Step 0에서 생성한 타입
- `/packages/shared/src/schemas/resume-profile.schema.ts` — Step 0에서 생성한 스키마

이전 steps 완료 summary:
- Step 0: ResumeProfileDto 타입 및 Zod 스키마 packages/shared에 추가
- Step 1: resume-profiles NestJS 모듈 생성 — CRUD, experiences populate 포함

## 작업

이력 프로필 TanStack Query 훅을 생성한다.

### 생성할 파일

**`apps/web/hooks/use-resume-profiles.ts`**

기존 use-career-descriptions.ts 패턴을 따른다:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ResumeProfileDto,
  CreateResumeProfileInput,
  UpdateResumeProfileInput,
} from '@2chi/shared';

const RESUME_PROFILE_KEY = ['resume-profiles'] as const;

export function useResumeProfiles(): UseQueryResult<ResumeProfileDto[]>
  // GET /resume-profiles

export function useResumeProfile(id: string): UseQueryResult<ResumeProfileDto>
  // GET /resume-profiles/:id (experiences 포함)

export function useCreateResumeProfile(): UseMutationResult<ResumeProfileDto, Error, CreateResumeProfileInput>
  // POST /resume-profiles
  // onSuccess: invalidateQueries(RESUME_PROFILE_KEY)

export function useUpdateResumeProfile(id: string): UseMutationResult<ResumeProfileDto, Error, UpdateResumeProfileInput>
  // PATCH /resume-profiles/:id
  // onSuccess: invalidateQueries([...RESUME_PROFILE_KEY, id])

export function useDeleteResumeProfile(): UseMutationResult<void, Error, string>
  // DELETE /resume-profiles/:id
  // onSuccess: invalidateQueries(RESUME_PROFILE_KEY)
```

## Acceptance Criteria

```bash
cd apps/web && pnpm build
# 타입 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - 모든 mutation 성공 시 관련 query가 invalidate되는가?
3. 성공 시 `phases/phase3-c-resume-profile/index.json`의 step 2를 업데이트한다:
   - `"status": "completed"`, `"summary": "use-resume-profiles.ts 생성 — CRUD 훅 5개 포함"`
