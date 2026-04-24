# Step 1: files-module

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md`
- `docs/ADR.md` — ADR-007 Cloudflare R2 섹션 필독
- `apps/api/src/app.module.ts`
- `apps/api/src/companies/companies.module.ts` — NestJS 모듈 패턴 참고
- `.env.example` — 기존 환경 변수 확인

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Cloudflare R2 파일 스토리지 공통 모듈을 구현한다. R2는 S3 호환 API이므로 `@aws-sdk/client-s3`와 `@aws-sdk/s3-request-presigner`를 사용한다.

### 패키지 설치

```bash
cd apps/api && pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 생성할 파일

#### `apps/api/src/files/files.service.ts`

아래 메서드를 구현한다:

```typescript
@Injectable()
export class FilesService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    // R2 endpoint: https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com
    // region: 'auto'
  }

  // Buffer를 R2에 업로드하고 object key를 반환한다
  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string>

  // Presigned 다운로드 URL을 생성한다 (TTL: 3600초)
  async getSignedDownloadUrl(key: string): Promise<string>

  // R2에서 파일을 삭제한다
  async deleteFile(key: string): Promise<void>
}
```

#### `apps/api/src/files/files.module.ts`

```typescript
@Module({
  imports: [ConfigModule],
  providers: [FilesService],
  exports: [FilesService],  // 다른 모듈에서 import 가능하도록 반드시 export
})
export class FilesModule {}
```

### 수정할 파일

#### `apps/api/src/app.module.ts`

`FilesModule`을 imports 배열에 추가한다.

#### `.env.example`

아래 환경 변수를 추가한다:

```
# Cloudflare R2 (Phase 2부터 필요)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=https://{bucket}.{account}.r2.cloudflarestorage.com
```

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
# lint 에러 없음
cd apps/api && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `FilesModule`이 `exports: [FilesService]`를 포함하는가?
   - R2 자격증명이 `ConfigService`를 통해 주입되는가 (하드코딩 없음)?
   - `.env.example`에 R2 변수 5개가 모두 문서화되었는가?
3. 결과에 따라 `phases/phase2-a-career-desc/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "FilesModule(R2 업로드/Signed URL/삭제) 구현 완료, .env.example에 R2 변수 추가"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- `puppeteer`나 별도 R2 전용 SDK를 설치하지 마라. 이유: R2는 S3 호환이므로 `@aws-sdk/client-s3`만으로 충분하다.
- R2 자격증명을 소스코드에 하드코딩하지 마라. 이유: 보안 사고의 직접 원인이 된다.
- `FilesModule`에 PDF 생성 로직을 포함하지 마라. 이유: 파일 스토리지와 PDF 생성은 관심사가 다르다. PDF 생성은 step 3에서 career-descriptions 모듈이 담당한다.
- `FilesModule`을 global로 선언하지 마라. 이유: 필요한 모듈에서만 명시적으로 import해야 의존성이 명확하다.
