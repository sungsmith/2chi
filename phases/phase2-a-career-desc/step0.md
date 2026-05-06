# Step 0: shared-career-desc-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md`
- `docs/ADR.md`
- `packages/shared/src/index.ts`
- `packages/shared/src/types/cover-letter.ts` — 기존 타입 구조 참고
- `packages/shared/src/schemas/cover-letter.schema.ts` — 기존 스키마 패턴 참고
- `apps/api/prisma/schema.prisma` — CareerDescription, CareerDescriptionSection 모델 확인

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`packages/shared`에 경력기술서 관련 타입과 Zod 스키마를 추가한다.

### 생성할 파일

#### `packages/shared/src/types/career-description.ts`

아래 타입들을 정의한다:

```typescript
export type SectionType = 'INTRO' | 'EXPERIENCE' | 'SKILL' | 'ACHIEVEMENT' | 'CUSTOM';

export interface SectionContent {
  heading: string;
  body: string;
}

export interface CareerDescriptionSectionDto {
  id: string;
  careerDescriptionId: string;
  experienceId: string | null;
  sectionType: SectionType;
  order: number;
  content: SectionContent;
}

export interface CareerDescriptionDto {
  id: string;
  userId: string;
  title: string;
  versionLabel: string | null;
  targetJobType: string | null;
  pdfUrl: string | null;
  sections: CareerDescriptionSectionDto[];
  createdAt: string;
  updatedAt: string;
}
```

#### `packages/shared/src/schemas/career-description.schema.ts`

```typescript
import { z } from 'zod';

export const createCareerDescriptionSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(100),
  versionLabel: z.string().max(50).optional(),
  targetJobType: z.string().max(100).optional(),
});

export const updateCareerDescriptionSchema = createCareerDescriptionSchema.partial();

export const updateSectionSchema = z.object({
  content: z.object({
    heading: z.string(),
    body: z.string(),
  }),
  order: z.number().int().min(0).optional(),
});

export const generateSectionDraftSchema = z.object({
  experienceIds: z.array(z.string()).optional(),
  targetJobType: z.string().optional(),
});

export type CreateCareerDescriptionInput = z.infer<typeof createCareerDescriptionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type GenerateSectionDraftInput = z.infer<typeof generateSectionDraftSchema>;
```

### 수정할 파일

#### `packages/shared/src/index.ts`

새 파일들을 export에 추가한다:

```typescript
export * from './types/career-description';
export * from './schemas/career-description.schema';
```

## Acceptance Criteria

```bash
cd packages/shared && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `packages/shared/src/index.ts`에서 새 타입이 export되는가?
   - `SectionContent`가 `Json` raw 타입이 아닌 명시적 인터페이스인가?
   - 기존 타입(CoverLetterDto 등)이 변경되지 않았는가?
3. 결과에 따라 `phases/phase2-a-career-desc/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "packages/shared에 CareerDescriptionDto, SectionType, Zod 스키마 추가 완료"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- `apps/api` 또는 `apps/web` 파일을 수정하지 마라. 이유: step 0은 shared 타입만 담당하며, 다른 레이어를 건드리면 의존성 순서가 무너진다.
- `SectionContent`를 `Json` raw 타입으로 선언하지 마라. 이유: 프론트에서 타입 안전한 접근이 불가능해진다.
- 기존 export를 제거하거나 변경하지 마라.
