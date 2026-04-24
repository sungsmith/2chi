# Step 3: onboarding-hooks

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `apps/web/hooks/use-cover-letters.ts` — TanStack Query 훅 패턴
- `apps/web/lib/api.ts` — API 클라이언트 구조 (JSON만 지원)
- `apps/web/store/auth.store.ts` — 인증 토큰 접근 방법 확인
- `packages/shared/src/types/onboarding.ts` — OnboardingParseResultDto
- `packages/shared/src/schemas/onboarding.schema.ts` — confirmOnboardingSchema

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

온보딩 파일 업로드와 결과 확인 관련 훅을 생성한다.

### 생성할 파일

#### `apps/web/hooks/use-onboarding.ts`

```typescript
// 파일 업로드 + 파싱 요청
// FormData를 직접 fetch로 전송 (api.ts의 api.post() 사용 불가 — JSON 전용)
// 인증 헤더 포함 필요
export function useParseResume(): {
  mutate: (file: File) => void;
  isPending: boolean;
  data: OnboardingParseResultDto | undefined;
  error: Error | null;
  reset: () => void;
}

// 파싱 결과 확인 + Experience 생성
export function useConfirmParsed(): {
  mutate: (input: ConfirmOnboardingInput) => void;
  isPending: boolean;
  isSuccess: boolean;
  data: { createdCount: number; experienceIds: string[] } | undefined;
}
```

**useParseResume 구현 상세:**
```typescript
// api.ts의 api.post()가 아닌 fetch를 직접 사용한다
const token = useAuthStore.getState().accessToken;
const formData = new FormData();
formData.append('file', file);

const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/parse`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  // Content-Type 헤더를 명시하지 않는다 — fetch가 FormData 감지 후 자동으로 설정
  body: formData,
});
```

**useConfirmParsed 구현:**
- 성공 시 `experiences` 쿼리 키 무효화 (새로 생성된 경험이 목록에 반영되어야 함)

## Acceptance Criteria

```bash
cd apps/web && pnpm lint
cd apps/web && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `useParseResume`이 `api.post()` 대신 `fetch` + `FormData`를 사용하는가?
   - `Content-Type` 헤더를 수동으로 `multipart/form-data`로 설정하지 않았는가? (boundary 자동 설정 방해 금지)
   - `useConfirmParsed` 성공 시 experiences 캐시가 무효화되는가?
3. 결과에 따라 `phases/phase2-c-onboarding-pdf/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "use-onboarding.ts 생성 (useParseResume, useConfirmParsed)"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- 기존 `lib/api.ts`의 `api.post()`를 파일 업로드에 사용하지 마라. 이유: `api.ts`는 `Content-Type: application/json`으로 고정되어 있어 multipart/form-data를 보내면 서버가 파일을 인식하지 못한다.
- `Content-Type: multipart/form-data`를 헤더에 수동으로 설정하지 마라. 이유: boundary 값을 누락하게 되어 서버 파싱이 실패한다. FormData를 body에 넣으면 fetch가 자동으로 올바른 Content-Type + boundary를 설정한다.
