# Step 3: company-analysis-enhanced-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md`
- `apps/api/src/companies/companies.service.ts` — 기존 서비스, calculateMatchingScore 패턴 확인
- `apps/api/src/companies/companies.controller.ts` — 기존 엔드포인트
- `apps/api/src/companies/companies.module.ts` — 기존 모듈 구조
- `apps/api/src/ai/ai.service.ts` — step 1에서 추가한 analyzeCompetencyGap()
- `packages/shared/src/types/cover-letter.ts` — CompetencyGapDto
- `apps/api/prisma/schema.prisma` — Company, JobPosting, Experience 관계 확인

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

기업 분석 모듈에 채용공고 기반 역량 갭 분석 엔드포인트를 추가한다.

### 생성할 파일

#### `apps/api/src/companies/dto/gap-analysis.dto.ts`

```typescript
export class GapAnalysisDto {
  @IsString()
  @IsNotEmpty()
  jobPostingId: string;
}
```

### 수정할 파일

#### `apps/api/src/companies/companies.service.ts`

기존 서비스에 `analyzeGap` 메서드를 추가한다:

```typescript
async analyzeGap(
  companyId: string,
  jobPostingId: string,
  userId: string,
): Promise<CompetencyGapDto> {
  // 1. Company 조회 (userId 소유 확인은 불필요 — 기업 정보는 공용)
  // 2. JobPosting 조회 (userId 검증 필요)
  //    - 없거나 userId 불일치 시 NotFoundException
  // 3. 사용자의 Experience 목록 + tags 조회
  // 4. requiredCompetencies = jobPosting.requiredCompetencies + company.keyCompetencies
  // 5. preferredCompetencies = jobPosting.preferredCompetencies
  // 6. aiService.analyzeCompetencyGap(required, preferred, experiences)
  // 7. CompetencyGapDto 반환
}
```

#### `apps/api/src/companies/companies.controller.ts`

역량 갭 분석 엔드포인트 추가:

```
POST /companies/:id/gap-analysis
Body: { jobPostingId: string }
Response: { success: true, data: CompetencyGapDto }
```

#### `apps/api/src/companies/companies.module.ts`

`ExperiencesModule`과 `AiModule`이 imports에 없으면 추가한다.

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
cd apps/api && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `calculateMatchingScore()` 메서드가 변경되지 않았는가?
   - JobPosting의 userId 검증이 있는가?
   - `keyCompetencies`와 `requiredCompetencies`가 합산되는가?
3. 결과에 따라 `phases/phase2-b-job-posting-scrape/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "POST /companies/:id/gap-analysis 엔드포인트 추가 완료"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- 기존 `calculateMatchingScore()` 메서드를 수정하지 마라. 이유: cover-letter 매칭도 계산이 이 메서드에 의존하며 수정하면 기존 기능이 깨진다.
- Company 조회 시 userId를 검증하지 마라. 이유: 기업 정보는 공용 데이터이며 userId별로 분리되지 않는다.
- JobPosting 없이 gap-analysis를 수행하지 마라. 이유: 채용공고의 역량 정보 없이는 정확한 갭 분석이 불가능하다.
