# Step 2: onboarding-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md` — PDF 파싱 섹션, 파일 업로드 지원 형식
- `apps/api/src/experiences/experiences.service.ts` — create 메서드 시그니처
- `apps/api/src/experiences/experiences.module.ts` — ExperiencesModule exports 확인
- `apps/api/src/ai/ai.service.ts` — step 1에서 추가한 parseResumeToExperiences()
- `packages/shared/src/types/onboarding.ts` — ParsedExperience, OnboardingParseResultDto
- `packages/shared/src/schemas/onboarding.schema.ts` — confirmOnboardingSchema
- `apps/api/src/app.module.ts` — CacheModule 설정 확인

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

이력서 파일 업로드 → 텍스트 추출 → AI 구조화 → 경험 자동 등록 API를 구현한다.

### 패키지 설치

```bash
cd apps/api && pnpm add pdf-parse mammoth @nestjs/cache-manager cache-manager
cd apps/api && pnpm add -D @types/pdf-parse @types/mammoth
```

### 생성할 파일

#### `apps/api/src/onboarding/onboarding.service.ts`

```typescript
@Injectable()
export class OnboardingService {
  constructor(
    private readonly aiService: AiService,
    private readonly experiencesService: ExperiencesService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async parse(
    userId: string,
    file: Express.Multer.File,
  ): Promise<OnboardingParseResultDto> {
    // 1. 파일 확장자 확인 (.pdf / .docx만 허용)
    //    지원하지 않는 형식: BadRequestException('PDF 또는 Word 파일만 지원합니다.')
    //
    // 2. 텍스트 추출
    //    .pdf  → pdf-parse(file.buffer)
    //    .docx → mammoth.extractRawText({ buffer: file.buffer })
    //
    // 3. aiService.parseResumeToExperiences(text) → { experiences, confidence }
    //
    // 4. parseId = cuid() 생성
    //    cacheKey = `onboarding:${userId}:${parseId}`
    //    cacheManager.set(cacheKey, { experiences, rawText: text }, 30 * 60 * 1000) // TTL 30분
    //
    // 5. OnboardingParseResultDto 반환
  }

  async confirm(
    userId: string,
    dto: ConfirmOnboardingDto,
  ): Promise<{ createdCount: number; experienceIds: string[] }> {
    // 1. cacheKey = `onboarding:${userId}:${dto.parseId}`
    //    cacheManager.get(cacheKey) → 없으면 NotFoundException('파싱 결과가 만료되었습니다. 다시 업로드해주세요.')
    //
    // 2. dto.experiences 순서대로 experiencesService.create() 호출
    //    각 ParsedExperience → CreateExperienceDto 변환 (tagNames 포함)
    //
    // 3. cacheManager.del(cacheKey) — 사용 후 즉시 삭제
    //
    // 4. { createdCount, experienceIds } 반환
  }
}
```

#### `apps/api/src/onboarding/dto/confirm-onboarding.dto.ts`

`confirmOnboardingSchema` 기반 class-validator DTO.

#### `apps/api/src/onboarding/onboarding.controller.ts`

```
POST /onboarding/parse
  Content-Type: multipart/form-data
  FileInterceptor('file')
  파일 크기 제한: 10MB
  MIME 허용: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document
  Response: { success: true, data: OnboardingParseResultDto }

POST /onboarding/confirm
  Body: ConfirmOnboardingDto
  Response: { success: true, data: { createdCount: number; experienceIds: string[] } }
```

#### `apps/api/src/onboarding/onboarding.module.ts`

```typescript
@Module({
  imports: [
    AiModule,
    ExperiencesModule,
    CacheModule.register({ ttl: 30 * 60 * 1000 }),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
```

### 수정할 파일

#### `apps/api/src/app.module.ts`

`OnboardingModule`을 imports 배열에 추가한다.

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
cd apps/api && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 보안/아키텍처 체크리스트:
   - 이력서 원본 파일이 R2나 디스크에 저장되지 않는가?
   - CacheManager TTL이 30분으로 설정되었는가?
   - `confirm` 엔드포인트에서 `userId`가 포함된 cache key를 사용하는가? (다른 사용자의 parseId 사용 방지)
   - HWP 파일 업로드 시 BadRequestException이 반환되는가?
3. 결과에 따라 `phases/phase2-c-onboarding-pdf/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "OnboardingModule 구현 완료 — parse(PDF/DOCX → AI 구조화 → Cache), confirm(Experience 생성) 엔드포인트"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- 이력서 원본 파일을 R2나 로컬 디스크에 저장하지 마라. 이유: 이력서에는 주민등록번호, 주소 등 개인정보가 포함될 수 있다. 파싱에만 사용하고 즉시 버려야 한다. Multer는 `memoryStorage`만 사용하라.
- 파싱 결과를 DB에 영속화하지 마라. 이유: 사용자가 확인하지 않은 임시 데이터이므로 CacheManager로 충분하다.
- HWP 파일을 처리하지 마라. 이유: `docs/ARCHITECTURE.md`에 HWP 미지원이 명시되어 있으며, libreoffice 같은 무거운 의존성이 필요하다.
- `confirm` 시 userId 없이 parseId만으로 캐시를 조회하지 마라. 이유: 다른 사용자의 parseId를 사용해 타인의 파싱 결과를 확인할 수 있는 보안 취약점이 생긴다.
