# Step 6: company-analysis-enhanced-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/UI_GUIDE.md` — 디자인 시스템, 안티패턴
- `apps/web/app/(dashboard)/company/[id]/page.tsx` — 기업 상세 페이지 현재 구조
- `apps/web/components/company/competency-list.tsx` — 기존 역량 컴포넌트
- `apps/web/hooks/use-companies.ts` — step 4에서 추가한 useCompetencyGapAnalysis
- `apps/web/hooks/use-job-postings.ts` — useJobPostings
- `packages/shared/src/types/cover-letter.ts` — CompetencyGapDto, JobPostingDto

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

기업 상세 페이지에 채용공고 선택 + 역량 갭 시각화 섹션을 추가한다.

### 생성할 파일

#### `apps/web/components/company/competency-gap.tsx`

역량 갭 시각화 컴포넌트:

```
CompetencyGap props: { gap: CompetencyGapDto }

구성:
├── 매칭도 점수 (숫자 + 텍스트 바)
├── 매칭된 역량 (bg-green-50 text-green-700 태그)
├── 부족한 역량 (bg-red-50 text-red-600 태그)
└── "이 역량 보완하기" → /experience 링크
```

**시각화 방식:** CSS 태그 나열 방식. Chart.js, D3 등 차트 라이브러리 사용 금지.

### 수정할 파일

#### `apps/web/app/(dashboard)/company/[id]/page.tsx`

기존 기업 상세 페이지에 역량 갭 분석 섹션을 추가한다:

1. 사용자의 채용공고 목록 드롭다운 (`useJobPostings()` 사용)
2. 채용공고 선택 → "갭 분석" 버튼
3. `useCompetencyGapAnalysis()` mutation 호출
4. 결과 → `CompetencyGap` 컴포넌트로 렌더링

**기존 기업 정보(officialInfo, keyCompetencies 등) 표시는 변경하지 마라.**

## Acceptance Criteria

```bash
cd apps/web && pnpm lint
cd apps/web && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. UI/UX 체크리스트:
   - 채용공고가 없을 때 "채용공고를 먼저 추가해주세요" 안내가 표시되는가?
   - 갭 분석 중 버튼이 비활성화되는가?
   - 매칭/부족 역량이 색상으로 구분되는가?
   - 기존 기업 정보 섹션이 그대로 유지되는가?
3. 결과에 따라 `phases/phase2-b-job-posting-scrape/index.json`의 step 6을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "CompetencyGap 컴포넌트 생성, 기업 상세 페이지에 역량 갭 분석 섹션 추가 완료"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- Chart.js, D3, Recharts 등 차트 라이브러리를 설치하지 마라. 이유: 역량 태그 시각화는 CSS만으로 충분하며 추가 번들 크기를 정당화할 수 없다.
- 기존 기업 상세 페이지의 officialInfo, keyCompetencies 표시 부분을 수정하지 마라. 이유: 기존 기능을 깨뜨리지 않기 위함이다.
- `UI_GUIDE.md`에서 금지한 디자인 패턴을 사용하지 마라.
