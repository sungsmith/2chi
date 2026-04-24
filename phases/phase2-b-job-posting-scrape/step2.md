# Step 2: job-postings-scrape-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md`
- `apps/api/src/job-postings/job-postings.service.ts` — 기존 서비스 구조 확인
- `apps/api/src/job-postings/job-postings.controller.ts` — 기존 엔드포인트 확인
- `apps/api/src/job-postings/job-postings.module.ts` — 기존 모듈 구조 확인
- `apps/api/src/ai/ai.service.ts` — step 1에서 추가한 parseJobPostingFromHtml()
- `packages/shared/src/schemas/cover-letter.schema.ts` — scrapeJobPostingSchema
- `apps/api/prisma/schema.prisma` — JobPosting 모델 구조

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

채용공고 URL을 입력받아 자동으로 파싱하고 저장하는 API 엔드포인트를 추가한다.

### 생성할 파일

#### `apps/api/src/job-postings/dto/scrape-job-posting.dto.ts`

```typescript
export class ScrapeJobPostingDto {
  @IsUrl({}, { message: '올바른 URL을 입력하세요.' })
  url: string;
}
```

### 수정할 파일

#### `apps/api/src/job-postings/job-postings.service.ts`

기존 서비스에 `scrapeAndCreate` 메서드를 추가한다:

```typescript
async scrapeAndCreate(userId: string, dto: ScrapeJobPostingDto): Promise<JobPostingDto> {
  // 1. fetch(url)로 HTML 취득
  //    - User-Agent 헤더: 'Mozilla/5.0 (compatible; 2chi-bot/1.0)'
  //    - 타임아웃: 10초 (AbortController 사용)
  //    - 실패 시: BadRequestException('해당 URL의 채용공고를 가져올 수 없습니다.')
  //
  // 2. aiService.parseJobPostingFromHtml(html) → 구조화 데이터
  //
  // 3. Company upsert (기존 parseAndCreate의 패턴 동일)
  //    - company 이름으로 찾거나 새로 생성
  //
  // 4. prisma.jobPosting.create({
  //      url: dto.url,
  //      userId,
  //      companyId: company.id,
  //      title, rawText, requiredCompetencies, preferredCompetencies, scrapedAt: new Date()
  //    })
}
```

#### `apps/api/src/job-postings/job-postings.controller.ts`

기존 엔드포인트에 URL 스크랩 엔드포인트를 추가한다:

```
POST /job-postings/scrape
Body: { url: string }
Response: { success: true, data: JobPostingDto }
```

**주의:** `/scrape`는 `/:id`보다 앞에 선언되어야 한다. 이유: NestJS 라우터가 `/scrape`를 `:id`로 해석할 수 있다.

#### `apps/api/src/job-postings/job-postings.module.ts`

`AiModule`이 imports에 없으면 추가한다.

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
cd apps/api && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `/scrape` 라우트가 `/:id`보다 앞에 선언되었는가?
   - fetch 타임아웃이 10초로 설정되었는가?
   - 스크랩 실패 시 `BadRequestException`이 throw되는가?
   - `scrapedAt` 필드가 DB에 저장되는가?
3. 결과에 따라 `phases/phase2-b-job-posting-scrape/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "POST /job-postings/scrape 엔드포인트 추가 완료 — URL fetch → AI 파싱 → JobPosting 저장"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- Puppeteer를 URL 스크랩에 사용하지 마라. 이유: Headless Chrome은 무겁고 대부분의 채용공고는 단순 fetch로 파싱 가능하다.
- 스크랩 실패를 조용히 무시하지 마라. 이유: URL 스크랩 실패 시 사용자가 인지해야 텍스트 직접 입력으로 대체할 수 있다.
- 기존 `parseAndCreate` 메서드를 수정하지 마라. 이유: 텍스트 붙여넣기 기능이 이 메서드에 의존한다.
