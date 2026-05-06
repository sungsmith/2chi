# Step 4: portfolio-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/UI_GUIDE.md`
- `/apps/web/app/(dashboard)/career-desc/page.tsx` — 목록 페이지 패턴
- `/apps/web/app/(dashboard)/career-desc/[id]/page.tsx` — 상세 페이지 패턴
- `/apps/web/components/career-desc/` — 컴포넌트 패턴
- `/apps/web/hooks/use-portfolios.ts` — Step 3에서 생성한 훅
- `/apps/web/hooks/use-portfolio-section-draft.ts` — Step 3에서 생성한 SSE 훅

이전 steps 완료 summary:
- Step 0: PortfolioDto, PortfolioSectionDto 타입 및 Zod 스키마 packages/shared에 추가
- Step 1: portfolio.prompt.ts 생성, AiService에 streamPortfolioSectionDraft 메서드 추가
- Step 2: portfolios NestJS 모듈 생성 — CRUD, 섹션 관리, AI SSE 스트리밍, PDF 생성 포함
- Step 3: use-portfolios.ts (TanStack Query 훅), use-portfolio-section-draft.ts (SSE 훅) 생성

## 작업

포트폴리오 페이지와 컴포넌트를 구현한다.

### 생성할 파일

**`apps/web/app/(dashboard)/portfolio/page.tsx`**

포트폴리오 목록 페이지:
- `usePortfolios()` 훅으로 목록 조회
- 포트폴리오 카드 목록 (제목, 버전 라벨, 섹션 수, 수정일)
- "+ 새 포트폴리오" 버튼 → 생성 Dialog 또는 모달 (templateId, title, versionLabel 입력)
- 카드 클릭 → `/portfolio/[id]`로 이동
- 삭제 버튼 (확인 Dialog 후 삭제)

**`apps/web/app/(dashboard)/portfolio/[id]/page.tsx`**

포트폴리오 상세/편집 페이지:
- `usePortfolio(id)` 훅으로 단건 조회
- 좌측 패널: 섹션 목록 (섹션 타입 뱃지, 제목, 순서 변경 버튼 ↑↓)
- 우측 패널: 선택된 섹션 편집 에디터 (textarea)
- "AI 초안 생성" 버튼 → `usePortfolioSectionDraft` 호출, 스트리밍 중 실시간으로 textarea 채우기
- "저장" 버튼 → `useUpdateSection` 호출
- "PDF 다운로드" 버튼 → `useGeneratePortfolioPdf` 호출 후 Signed URL로 window.open
- "+ 섹션 추가" 버튼 → 섹션 타입/제목 입력 후 `useCreateSection` 호출

**`apps/web/components/portfolio/portfolio-card.tsx`**

포트폴리오 카드 컴포넌트. 제목, 버전 라벨, 섹션 수, 수정일 표시. 삭제 버튼 포함.

**`apps/web/components/portfolio/portfolio-form.tsx`**

포트폴리오 생성/수정 폼. templateId 선택 (basic/modern/minimal), title, versionLabel 필드.

**`apps/web/components/portfolio/section-editor.tsx`**

섹션 편집기:
- textarea로 content 편집
- "AI 초안 생성" 버튼 (isStreaming 중 비활성화)
- 스트리밍 중 실시간 텍스트 표시

**`apps/web/components/portfolio/section-list.tsx`**

섹션 목록:
- 섹션 타입 뱃지 (shadcn/ui Badge 사용)
- 순서 변경 버튼 (위/아래)
- 섹션 클릭 시 우측 에디터에 선택된 섹션 표시

### 수정할 파일

**사이드바/네비게이션 파일** (경로는 기존 컴포넌트 확인 후 적용)

"포트폴리오" 메뉴 항목 추가 (`/portfolio` 링크). 기존 메뉴 항목 패턴과 동일하게 추가한다.

## Acceptance Criteria

```bash
cd apps/web && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - `/portfolio` 페이지가 빌드 에러 없이 렌더링되는가?
   - 포트폴리오 생성/삭제가 훅을 통해 구현되어 있는가?
   - AI 초안 스트리밍이 실시간으로 textarea를 채우는가?
   - PDF 다운로드 버튼이 구현되어 있는가?
   - 사이드바에 포트폴리오 링크가 추가되었는가?
3. 성공 시 `phases/phase3-a-portfolio/index.json`의 step 4를 업데이트한다:
   - `"status": "completed"`, `"summary": "포트폴리오 목록/상세 페이지, 컴포넌트 생성, 사이드바 메뉴 추가"`

## 금지사항

- Glass morphism, gradient-text, 글로우 효과를 사용하지 마라. 이유: UI_GUIDE.md에 따라 취업 도구는 실용성 우선이다.
- 드래그 앤 드롭 라이브러리를 추가하지 마라. 이유: 순서 변경은 위/아래 버튼으로 충분하다.
- 기존 컴포넌트(Button, Dialog, Badge 등)를 재구현하지 마라. 이유: shadcn/ui 컴포넌트를 import하여 사용한다.
