# Step 3: career-descriptions-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md`
- `docs/ADR.md`
- `apps/api/prisma/schema.prisma` — CareerDescription, CareerDescriptionSection 모델
- `apps/api/src/cover-letters/cover-letters.service.ts` — streamDraft() SSE 패턴 필독
- `apps/api/src/cover-letters/cover-letters.controller.ts` — 컨트롤러 패턴
- `apps/api/src/files/files.service.ts` — step 1에서 생성한 파일 서비스
- `apps/api/src/ai/ai.service.ts` — step 2에서 추가한 streamCareerDescSectionDraft()
- `packages/shared/src/types/career-description.ts` — step 0에서 생성한 타입

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

경력기술서 CRUD, SSE 스트리밍 초안 생성, Puppeteer PDF 생성 API를 구현한다.

### 패키지 설치

```bash
cd apps/api && pnpm add puppeteer-core @sparticuz/chromium handlebars
cd apps/api && pnpm add -D @types/handlebars
```

### 생성할 파일

#### `apps/api/src/career-descriptions/dto/create-career-description.dto.ts`

`packages/shared`의 `createCareerDescriptionSchema`를 기반으로 class-validator DTO를 작성한다.

#### `apps/api/src/career-descriptions/dto/update-section.dto.ts`

`packages/shared`의 `updateSectionSchema`를 기반으로 class-validator DTO를 작성한다.

#### `apps/api/src/career-descriptions/dto/generate-section-draft.dto.ts`

`packages/shared`의 `generateSectionDraftSchema`를 기반으로 class-validator DTO를 작성한다.

#### `apps/api/src/career-descriptions/templates/career-desc.hbs`

경력기술서 PDF 생성용 Handlebars 템플릿. 아래 구조를 따른다:
- 깔끔한 A4 PDF에 적합한 HTML
- 제목, 버전 라벨, 각 섹션(heading + body) 렌더링
- `@sparticuz/chromium` 기반 Puppeteer가 올바르게 렌더링할 수 있는 인라인 CSS

#### `apps/api/src/career-descriptions/career-descriptions.service.ts`

아래 메서드를 구현한다:

```typescript
@Injectable()
export class CareerDescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly filesService: FilesService,
  ) {}

  async findAll(userId: string): Promise<CareerDescriptionDto[]>
  async findOne(id: string, userId: string): Promise<CareerDescriptionDto>
  async create(userId: string, dto: CreateCareerDescriptionDto): Promise<CareerDescriptionDto>
  async update(id: string, userId: string, dto: UpdateCareerDescriptionDto): Promise<CareerDescriptionDto>
  async remove(id: string, userId: string): Promise<void>

  // SSE 스트리밍 — cover-letters.service.ts의 streamDraft() 패턴과 동일하게 구현
  async streamSectionDraft(
    id: string,
    sectionId: string,
    userId: string,
    dto: GenerateSectionDraftDto,
    res: Response,
  ): Promise<void>

  // 섹션 내용 저장
  async updateSection(
    id: string,
    sectionId: string,
    userId: string,
    dto: UpdateSectionDto,
  ): Promise<CareerDescriptionSectionDto>

  // PDF 생성 → R2 업로드 → Signed URL 반환
  async generatePdf(id: string, userId: string): Promise<string>
}
```

**generatePdf 구현 상세:**
1. DB에서 career description + sections 전체 조회
2. Handlebars 템플릿(`career-desc.hbs`) 로드 → 데이터 주입 → HTML 생성
3. `@sparticuz/chromium`으로 Chromium 실행경로 취득
4. `puppeteer-core`로 HTML → PDF Buffer 생성
5. `filesService.uploadBuffer(buffer, \`career-desc/${id}/document.pdf\`, 'application/pdf')`
6. DB의 `pdfUrl` 필드에 key 저장
7. `filesService.getSignedDownloadUrl(key)` → Signed URL 반환

**Handlebars 템플릿 빌드 포함 설정:**
`nest-cli.json`의 `assets` 배열에 `"career-descriptions/templates/**/*"` 추가.

#### `apps/api/src/career-descriptions/career-descriptions.controller.ts`

```
GET    /career-descriptions              — 내 경력기술서 목록
GET    /career-descriptions/:id          — 단건 조회
POST   /career-descriptions              — 생성 (기본 섹션 3개 자동 생성: INTRO, EXPERIENCE, SKILL)
PATCH  /career-descriptions/:id          — 제목/버전 수정
DELETE /career-descriptions/:id          — 삭제

POST   /career-descriptions/:id/sections/:sectionId/draft   — SSE 스트리밍 초안
PATCH  /career-descriptions/:id/sections/:sectionId          — 섹션 내용 저장
POST   /career-descriptions/:id/pdf                          — PDF 생성 → Signed URL
```

모든 엔드포인트는 `@UseGuards(JwtAuthGuard)` 적용. 다른 사용자의 리소스 접근 시 `ForbiddenException` throw.

#### `apps/api/src/career-descriptions/career-descriptions.module.ts`

```typescript
@Module({
  imports: [
    PrismaModule,
    AiModule,
    FilesModule,
    ExperiencesModule,  // streamSectionDraft에서 경험 데이터 조회
  ],
  controllers: [CareerDescriptionsController],
  providers: [CareerDescriptionsService],
})
export class CareerDescriptionsModule {}
```

### 수정할 파일

#### `apps/api/src/app.module.ts`

`CareerDescriptionsModule`을 imports 배열에 추가한다.

#### `apps/api/nest-cli.json`

assets에 Handlebars 템플릿 경로를 추가한다:
```json
{
  "compilerOptions": {
    "assets": ["**/*.hbs"]
  }
}
```

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
cd apps/api && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - SSE 스트리밍 헤더가 cover-letters와 동일한가? (`Content-Type: text/event-stream`, `Cache-Control: no-cache`)
   - `generatePdf` 완료 후 `pdfUrl`이 DB에 저장되는가?
   - `nest-cli.json`에 `.hbs` assets 설정이 있는가?
   - 다른 userId 접근 시 `ForbiddenException`이 발생하는가?
3. 결과에 따라 `phases/phase2-a-career-desc/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "CareerDescriptionsModule 구현 완료 — CRUD, SSE 스트리밍, Puppeteer PDF → R2 생성 포함"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- `puppeteer` 전체 패키지를 설치하지 마라. 이유: chromium 번들이 포함되어 Docker 이미지가 ~400MB 증가한다. `puppeteer-core`만 사용하라.
- PDF 생성을 Bull 큐에 넣지 마라. 이유: PDF 생성은 10초 이내 완료되며, 사용자가 즉시 결과를 받는 UX다.
- SSE 스트리밍 완료 후 섹션 내용을 자동으로 DB에 저장하지 마라. 이유: 사용자가 AI 초안을 검토 후 직접 저장 버튼을 눌러야 한다(PATCH 엔드포인트 사용).
- ExperiencesModule을 재구현하지 마라. 이유: 이미 phase1-b에서 구현된 모듈을 import해서 사용하라.
