# Step 5: job-posting-scrape-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/UI_GUIDE.md` — 디자인 시스템, 안티패턴
- `apps/web/app/(dashboard)/company/page.tsx` — 기업 분석 페이지 패턴 참고
- `apps/web/components/company/analyze-form.tsx` — 폼 컴포넌트 패턴 참고
- `apps/web/hooks/use-job-postings.ts` — step 4에서 생성한 훅
- `packages/shared/src/types/cover-letter.ts` — JobPostingDto
- `packages/shared/src/schemas/cover-letter.schema.ts` — scrapeJobPostingSchema

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

채용공고 URL 스크랩 모달과 채용공고 목록 페이지를 구현한다.

### 생성할 파일

#### `apps/web/components/job-posting/scrape-modal.tsx`

URL 입력 → 스크랩 결과 확인 2단계 모달:

**1단계 (URL 입력):**
- URL 입력 필드 (React Hook Form + scrapeJobPostingSchema 검증)
- "스크랩" 버튼
- 로딩 중: "채용공고를 불러오는 중입니다... (최대 15초 소요)"
- 스크랩 실패 시: "해당 사이트는 자동 수집이 어렵습니다. 공고 내용을 직접 붙여넣어 주세요." 메시지와 함께 텍스트 입력 폼으로 전환

**2단계 (결과 확인):**
- 파싱된 정보 표시: 공고 제목, 회사명, 필수역량 태그 목록
- "저장" 버튼 → 모달 닫기 + 목록 갱신
- "다시 입력" 버튼 → 1단계로 돌아가기

#### `apps/web/components/job-posting/job-posting-card.tsx`

채용공고 카드: 제목, 회사명, 스크랩일, 필수역량 태그 3개 미리보기 표시.

#### `apps/web/app/(dashboard)/job-posting/page.tsx`

채용공고 목록 페이지:
- `useJobPostings()` 훅으로 목록 조회
- "채용공고 추가" 버튼 → `ScrapeModal` 열기
- 채용공고 카드 목록

### 수정할 파일

#### `apps/web/components/shared/sidebar.tsx`

채용공고 메뉴를 기존 NAV_ITEMS에 추가한다. 순서: 기업 분석 다음.

## Acceptance Criteria

```bash
cd apps/web && pnpm lint
cd apps/web && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. UX 체크리스트:
   - 스크랩 실패 시 텍스트 입력 폴백이 표시되는가?
   - 스크랩 중 버튼이 비활성화되는가?
   - `UI_GUIDE.md` 안티패턴 없는가?
3. 결과에 따라 `phases/phase2-b-job-posting-scrape/index.json`의 step 5를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "ScrapeModal, JobPostingCard, 채용공고 목록 페이지 구현 완료"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- 스크랩 실패 시 에러 메시지만 보여주고 대안을 제시하지 않지 마라. 이유: 크롤링 차단은 흔한 케이스이며 텍스트 입력 폴백이 없으면 사용자가 막힌다.
- 기존 사이드바 메뉴 순서를 변경하지 마라. 이유: 기존 사용자의 탐색 패턴을 깨뜨리지 않기 위함이다.
- `UI_GUIDE.md`에서 금지한 디자인 패턴을 사용하지 마라.
