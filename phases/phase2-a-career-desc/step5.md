# Step 5: career-desc-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/UI_GUIDE.md` — 디자인 시스템, 안티패턴 필독
- `apps/web/app/(dashboard)/cover-letter/[id]/page.tsx` — AI 스트리밍 UX 패턴 필독
- `apps/web/app/(dashboard)/cover-letter/page.tsx` — 목록 페이지 패턴
- `apps/web/components/shared/sidebar.tsx` — 사이드바 메뉴 구조
- `apps/web/hooks/use-career-descriptions.ts` — step 4에서 생성한 훅
- `apps/web/hooks/use-section-draft.ts` — step 4에서 생성한 스트리밍 훅
- `packages/shared/src/types/career-description.ts` — 타입
- `packages/shared/src/schemas/career-description.schema.ts` — Zod 스키마

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

경력기술서 목록 페이지, 편집 페이지, 섹션 에디터 컴포넌트를 구현한다.

### 생성할 파일

#### `apps/web/components/career-desc/career-desc-card.tsx`

경력기술서 카드 컴포넌트. 표시 정보: 제목, 버전 라벨, 섹션 수, 생성일, PDF 존재 여부.

#### `apps/web/components/career-desc/section-editor.tsx`

섹션 편집 컴포넌트. 아래 기능을 포함한다:
- 섹션 타입 배지 (INTRO, EXPERIENCE 등) 표시
- "AI 초안 생성" 버튼 → `useSectionDraft` 훅 호출 → 스트리밍 텍스트 실시간 표시
- 스트리밍 완료 후 Textarea에서 직접 편집 가능
- "저장" 버튼 → `useUpdateSection` 훅 호출
- 스트리밍 상태: `idle | generating | done`

#### `apps/web/app/(dashboard)/career-desc/page.tsx`

경력기술서 목록 페이지:
- `useCareerDescriptions()` 훅으로 목록 조회
- 생성 버튼 → 제목 입력 모달 → `useCreateCareerDescription()` 호출
- 각 카드 클릭 → `/career-desc/:id` 이동

#### `apps/web/app/(dashboard)/career-desc/[id]/page.tsx`

경력기술서 편집 페이지:
- `useCareerDescription(id)` 훅으로 단건 조회
- 섹션 목록 렌더링 (각 섹션마다 `SectionEditor` 컴포넌트)
- "PDF 다운로드" 버튼:
  1. `useGeneratePdf()` mutation 호출
  2. 로딩 중 버튼 비활성화
  3. Signed URL 반환 시 `window.open(signedUrl, '_blank')` 로 새 탭 열기

### 수정할 파일

#### `apps/web/components/shared/sidebar.tsx`

경력기술서 메뉴를 기존 NAV_ITEMS 배열에 추가한다. 순서: 자소서 다음에 위치.

## Acceptance Criteria

```bash
cd apps/web && pnpm lint
cd apps/web && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. UI/UX 체크리스트:
   - 스트리밍 중 "AI 초안 생성" 버튼이 비활성화되는가?
   - PDF 생성 로딩 중 버튼이 비활성화되는가?
   - 서버 오류 시 사용자에게 에러 메시지가 표시되는가?
   - `UI_GUIDE.md`의 안티패턴(glass morphism, gradient-text, 글로우)이 없는가?
3. 결과에 따라 `phases/phase2-a-career-desc/index.json`의 step 5를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "경력기술서 목록/편집 페이지, SectionEditor, 사이드바 메뉴 추가 완료"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- 사이드바 기존 메뉴 순서를 변경하지 마라. 이유: 사용자가 익숙해진 네비게이션 순서를 깨뜨리지 않기 위함이다.
- `UI_GUIDE.md`에서 금지한 디자인 패턴(glass morphism, gradient-text, 글로우 효과, 불필요한 애니메이션)을 사용하지 마라. 이유: 취업 도구 서비스는 실용성이 우선이다.
- PDF 다운로드 Signed URL을 상태로 저장하지 마라. 이유: 1시간 후 만료되므로 매번 새로 요청해야 한다.
- `career-desc/[id]/page.tsx`에서 섹션 편집 로직을 직접 구현하지 마라. 이유: `SectionEditor` 컴포넌트로 분리해야 재사용 가능하다.
