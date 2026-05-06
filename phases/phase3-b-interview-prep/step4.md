# Step 4: interview-prep-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/UI_GUIDE.md`
- `/apps/web/app/(dashboard)/career-desc/page.tsx` — 목록 페이지 패턴
- `/apps/web/app/(dashboard)/career-desc/[id]/page.tsx` — 상세 페이지 패턴
- `/apps/web/hooks/use-interview-preps.ts` — Step 3에서 생성한 훅

이전 steps 완료 summary:
- Step 0: InterviewPrepDto, InterviewAnswerDto 타입 및 Zod 스키마 packages/shared에 추가
- Step 1: interview-prep.prompt.ts 생성, AiService에 generateInterviewQuestions(4o-mini), generateInterviewFeedback(4o) 추가
- Step 2: interview-preps NestJS 모듈 생성 — Bull Queue 비동기 질문생성/피드백, CRUD, 답변 저장 포함
- Step 3: use-interview-preps.ts 생성 — CRUD, 질문생성, 답변저장, 피드백 요청 훅 포함

## 작업

면접준비 페이지와 컴포넌트를 구현한다.

### 생성할 파일

**`apps/web/app/(dashboard)/interview-prep/page.tsx`**

면접준비 세션 목록:
- `useInterviewPreps()` 훅으로 목록 조회
- 세션 카드 목록 (제목, 공고 연결 여부, 질문 수, 평균 점수)
- "+ 새 면접 준비" 버튼 → 생성 Dialog (title, jobPostingId 선택 선택사항)
- 카드 클릭 → `/interview-prep/[id]`로 이동

**`apps/web/app/(dashboard)/interview-prep/[id]/page.tsx`**

면접 준비 세션 상세:
- `useInterviewPrep(id)` 훅으로 단건 조회
- 상단: 세션 제목, 연결된 공고명, 평균 점수
- "AI 질문 생성" 버튼 → `useGenerateQuestions` 호출, 완료 전까지 "질문 생성 중..." 표시
- 질문 목록:
  - 각 질문 카드: 유형 뱃지(shadcn Badge), 질문 텍스트, 답변 textarea
  - 답변 입력 후 "저장" 버튼 → `useSaveAnswer` 호출
  - "AI 피드백" 버튼 → `useRequestFeedback` 호출, 완료 전까지 "피드백 생성 중..." 표시
  - 피드백이 있으면 점수와 피드백 텍스트 표시

**`apps/web/components/interview-prep/interview-prep-card.tsx`**

세션 카드. 제목, 질문 수, 평균 점수 표시. 삭제 버튼 포함.

**`apps/web/components/interview-prep/question-item.tsx`**

질문 항목 컴포넌트:
- 유형 뱃지 (COMPETENCY=파란색, BEHAVIORAL=초록색, TECHNICAL=주황색, SITUATIONAL=보라색)
- 질문 텍스트
- 답변 textarea (저장 버튼)
- AI 피드백 요청 버튼
- 피드백 표시 영역 (점수 + 텍스트)

**`apps/web/components/interview-prep/generate-questions-form.tsx`**

질문 생성 폼:
- 생성할 질문 수 (기본 10, 3~20 범위)
- 질문 유형 선택 (체크박스 다중 선택, 기본 전체)

### 수정할 파일

**사이드바/네비게이션 파일** (경로는 기존 컴포넌트 확인 후 적용)

"면접 준비" 메뉴 항목 추가 (`/interview-prep` 링크).

## Acceptance Criteria

```bash
cd apps/web && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - `/interview-prep` 페이지가 빌드 에러 없이 렌더링되는가?
   - 질문 생성/답변 저장/피드백 요청이 훅을 통해 구현되어 있는가?
   - Bull Queue 비동기 작업이므로 로딩 상태가 명확히 표시되는가?
   - 사이드바에 면접 준비 링크가 추가되었는가?
3. 성공 시 `phases/phase3-b-interview-prep/index.json`의 step 4를 업데이트한다:
   - `"status": "completed"`, `"summary": "면접준비 목록/상세 페이지, 컴포넌트 생성, 사이드바 메뉴 추가"`

## 금지사항

- Glass morphism, gradient-text, 글로우 효과 사용 금지.
- AI 작업 결과를 즉시 반환하는 것처럼 UI를 구성하지 마라. 이유: Bull Queue 비동기 처리이므로 로딩 상태를 명확히 표시해야 한다.
- 기존 shadcn/ui 컴포넌트를 재구현하지 마라.
