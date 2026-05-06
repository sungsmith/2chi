# Step 3: resume-profile-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/UI_GUIDE.md`
- `/apps/web/app/(dashboard)/career-desc/page.tsx` — 목록 페이지 패턴
- `/apps/web/app/(dashboard)/experience/` — 경험 목록 페이지 (체크박스 선택 참고)
- `/apps/web/hooks/use-resume-profiles.ts` — Step 2에서 생성한 훅
- `/apps/web/hooks/` — 경험 조회 훅 파일명 확인 후 import

이전 steps 완료 summary:
- Step 0: ResumeProfileDto 타입 및 Zod 스키마 packages/shared에 추가
- Step 1: resume-profiles NestJS 모듈 생성 — CRUD, experiences populate 포함
- Step 2: use-resume-profiles.ts 생성 — CRUD 훅 5개 포함

## 작업

이력 프로필 페이지와 컴포넌트를 구현한다.

### 생성할 파일

**`apps/web/app/(dashboard)/resume-profile/page.tsx`**

프로필 목록:
- `useResumeProfiles()` 훅으로 목록 조회
- 프로필 카드 목록 (이름, 설명, 선택된 경험 수, 수정일)
- "+ 새 프로필" 버튼 → 생성 Dialog (name, description 입력)
- 카드 클릭 → `/resume-profile/[id]`로 이동

**`apps/web/app/(dashboard)/resume-profile/[id]/page.tsx`**

프로필 상세/편집:
- `useResumeProfile(id)` 훅으로 단건 조회 (experiences 포함)
- 상단: 프로필 이름·설명 편집 (인라인 편집 또는 폼)
- "전체 경험" 섹션: 모든 경험을 체크박스 목록으로 표시
  - 이미 selectedExperienceIds에 포함된 경험은 체크됨
  - 체크 변경 후 "저장" 버튼 → `useUpdateResumeProfile` 호출
- "선택된 경험" 섹션: 선택된 경험 카드 목록 (제목, 기간, 역할)

**`apps/web/components/resume-profile/resume-profile-card.tsx`**

프로필 카드. 이름, 설명 (truncate), 선택된 경험 수 표시. 삭제 버튼 포함.

**`apps/web/components/resume-profile/experience-selector.tsx`**

경험 체크박스 선택기:
- 전체 Experience 목록을 체크박스로 표시
- 각 항목: 경험 제목, 유형 뱃지, 기간
- 체크 상태는 `selectedExperienceIds`로 관리

### 수정할 파일

**사이드바/네비게이션 파일** (경로는 기존 컴포넌트 확인 후 적용)

"이력 프로필" 메뉴 항목 추가 (`/resume-profile` 링크).

## Acceptance Criteria

```bash
cd apps/web && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - `/resume-profile` 페이지가 빌드 에러 없이 렌더링되는가?
   - 경험 선택 체크박스가 `selectedExperienceIds`와 연동되는가?
   - 저장 버튼이 `useUpdateResumeProfile`을 호출하는가?
   - 사이드바에 이력 프로필 링크가 추가되었는가?
3. 성공 시 `phases/phase3-c-resume-profile/index.json`의 step 3을 업데이트한다:
   - `"status": "completed"`, `"summary": "이력프로필 목록/상세 페이지, 경험 선택기 컴포넌트 생성, 사이드바 메뉴 추가"`

## 금지사항

- 드래그 앤 드롭을 구현하지 마라. 이유: 체크박스 선택으로 충분하다. YAGNI.
- Glass morphism, gradient 효과 사용 금지.
- 경험 데이터를 직접 fetch하지 마라. 이유: 기존 경험 조회 훅(`useExperiences` 등)을 import하여 사용한다.
