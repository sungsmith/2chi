# Step 4: onboarding-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/UI_GUIDE.md` — 디자인 시스템, 안티패턴
- `apps/web/app/(dashboard)/experience/page.tsx` — 이력 목록 페이지 구조 참고
- `apps/web/components/shared/sidebar.tsx` — 사이드바 구조
- `apps/web/hooks/use-onboarding.ts` — step 3에서 생성한 훅
- `apps/web/hooks/use-experiences.ts` — useCreateExperience 패턴 참고
- `packages/shared/src/types/onboarding.ts` — ParsedExperience, OnboardingParseResultDto
- `packages/shared/src/schemas/onboarding.schema.ts` — confirmOnboardingSchema

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

이력서 파일 업로드 → 파싱 결과 확인/수정 → 경험 저장의 2단계 온보딩 UI를 구현한다.

### 생성할 파일

#### `apps/web/components/onboarding/resume-upload-zone.tsx`

파일 업로드 컴포넌트:
- 드래그&드롭 지원
- 클릭하여 파일 선택 지원
- 허용 형식: `.pdf`, `.docx` (accept 속성 설정)
- 파일 크기 제한 안내: 10MB 이하
- 파일 선택 후 파일명 표시
- "분석 시작" 버튼 → `useParseResume` mutate 호출
- 로딩 중: "이력서를 분석하고 있습니다... 최대 20초 소요됩니다." 표시
- 에러 시: 에러 메시지 표시

#### `apps/web/components/onboarding/parsed-experience-item.tsx`

파싱된 경험 단건 컴포넌트:
- 체크박스 (선택/비선택)
- 제목, 유형 배지, 회사명, 기간 표시
- 펼치기/접기 토글로 STAR 내용 미리보기
- 제목, 상황/과제/행동/결과 인라인 편집 (textarea)
- 태그 목록 표시

#### `apps/web/app/(dashboard)/onboarding/page.tsx`

2단계 온보딩 페이지:

**1단계 (파일 업로드):**
```
<ResumeUploadZone onSuccess={(result) => { setParseResult(result); setStep(2); }} />
```

**2단계 (결과 확인 및 저장):**
```
- 헤더: "총 {N}개의 경험을 발견했습니다."
- 신뢰도 표시: "AI 파싱 신뢰도: {confidence}%"
- ParsedExperience 목록 (ParsedExperienceItem 컴포넌트 사용)
- 전체 선택/해제 체크박스
- "선택 항목 저장 ({선택수}개)" 버튼
  → confirmOnboardingSchema 검증
  → useConfirmParsed mutate 호출
  → 성공 시: router.push('/experience') + toast "경험 {N}개가 저장되었습니다."
- "다시 업로드" 버튼 → 1단계로 초기화
```

**상태 관리:** `useState`로 step(1|2)과 parseResult 관리. Zustand 불필요.

### 수정할 파일

#### `apps/web/components/shared/sidebar.tsx`

온보딩 메뉴를 NAV_ITEMS 맨 아래(또는 내 이력 아래)에 추가한다.

## Acceptance Criteria

```bash
cd apps/web && pnpm lint
cd apps/web && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. UX/보안 체크리스트:
   - 파일 선택 input의 `accept` 속성이 `.pdf,.docx`로 설정되었는가?
   - HWP 파일이 UI에서 선택 불가한가?
   - 분석 중 버튼이 비활성화되는가?
   - 저장 전 체크박스로 선택한 항목만 confirm에 포함되는가?
   - `UI_GUIDE.md` 안티패턴 없는가?
3. 결과에 따라 `phases/phase2-c-onboarding-pdf/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "온보딩 2단계 UI 구현 완료 — ResumeUploadZone, ParsedExperienceItem, 온보딩 페이지"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- 파일 업로드 즉시 Experience를 생성하지 마라. 이유: AI 파싱 결과가 완벽하지 않으므로 반드시 사용자 확인 후 저장해야 한다.
- `.hwp` 파일을 `accept` 속성에 포함하지 마라. 이유: 백엔드가 HWP를 처리하지 않으므로 UI도 일치해야 한다.
- 온보딩 상태를 Zustand에 저장하지 마라. 이유: 온보딩은 일회성 플로우이며 `useState`로 충분하다. 전역 상태에 임시 데이터를 저장하면 앱 리로드 후 오래된 파싱 결과가 남아있을 수 있다.
- `UI_GUIDE.md`에서 금지한 디자인 패턴을 사용하지 마라.
