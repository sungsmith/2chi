# Step 4: career-desc-hooks

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `apps/web/hooks/use-cover-letters.ts` — TanStack Query 훅 패턴 필독
- `apps/web/lib/api.ts` — API 클라이언트 구조 (fetch wrapper)
- `apps/web/app/(dashboard)/cover-letter/[id]/page.tsx` — SSE 스트리밍 fetch 패턴
- `packages/shared/src/types/career-description.ts` — step 0에서 생성한 타입
- `packages/shared/src/schemas/career-description.schema.ts` — Zod 스키마

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

경력기술서 관련 TanStack Query 훅을 생성한다.

### 생성할 파일

#### `apps/web/hooks/use-career-descriptions.ts`

아래 훅들을 구현한다. `use-cover-letters.ts`의 패턴을 그대로 따른다.

```typescript
// 쿼리 키
const CD_KEY = ['career-descriptions'] as const;

// 훅 목록
export function useCareerDescriptions()      // GET /career-descriptions
export function useCareerDescription(id: string)  // GET /career-descriptions/:id
export function useCreateCareerDescription() // POST /career-descriptions
export function useUpdateCareerDescription() // PATCH /career-descriptions/:id
export function useDeleteCareerDescription() // DELETE /career-descriptions/:id
export function useUpdateSection()           // PATCH /career-descriptions/:id/sections/:sectionId
export function useGeneratePdf()             // POST /career-descriptions/:id/pdf → string (Signed URL)
```

**useGeneratePdf 구현 주의:**
- mutation으로 구현한다
- 성공 시 반환값은 Signed URL (string). TanStack Query 캐시에 저장하지 말 것
- 캐시에 저장 금지 이유: Signed URL은 1시간 후 만료되므로 stale URL이 반환될 수 있다

**SSE 스트리밍 훅은 별도 파일로 분리:**
- `apps/web/hooks/use-section-draft.ts` 생성
- `cover-letter/[id]/page.tsx`의 fetch ReadableStream 패턴을 그대로 복사해서 사용
- 시그니처: `useSectionDraft(careerDescriptionId: string, sectionId: string)`
- 반환: `{ stream, isStreaming, startStream, cancelStream }`

## Acceptance Criteria

```bash
cd apps/web && pnpm lint
# lint 에러 없음
cd apps/web && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 모든 훅이 `use-cover-letters.ts`와 동일한 쿼리 키 패턴을 사용하는가?
   - `useGeneratePdf`가 Signed URL을 캐시에 저장하지 않는가?
   - `useSectionDraft`가 인증 헤더를 포함해서 fetch하는가?
3. 결과에 따라 `phases/phase2-a-career-desc/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "use-career-descriptions.ts, use-section-draft.ts 훅 생성 완료"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- `useGeneratePdf`의 Signed URL 결과를 TanStack Query 캐시에 저장하지 마라. 이유: Signed URL은 1시간 후 만료되므로 stale URL을 반환하면 다운로드가 실패한다.
- SSE 스트리밍 로직을 `use-career-descriptions.ts`에 포함하지 마라. 이유: 스트리밍은 TanStack Query 패턴이 아니며 별도 훅으로 분리해야 관심사가 명확해진다.
- `api.ts`의 `api.post()`를 SSE 스트리밍에 사용하지 마라. 이유: `api.ts`는 JSON 응답을 기대하며 ReadableStream을 처리하지 못한다.
