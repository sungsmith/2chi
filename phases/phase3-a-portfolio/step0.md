# Step 0: shared-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/packages/shared/src/types/career-description.ts` — 섹션 패턴 참고
- `/packages/shared/src/schemas/career-description.schema.ts` — Zod 스키마 패턴 참고
- `/apps/api/prisma/schema.prisma` — Portfolio, PortfolioSection 모델 확인

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`packages/shared/src/` 아래에 포트폴리오 타입과 Zod 스키마를 추가한다.

### 생성할 파일

**`packages/shared/src/types/portfolio.ts`**

아래 타입을 정의한다:

```typescript
export type PortfolioSectionType = 'INTRO' | 'PROJECT' | 'SKILLS' | 'ACHIEVEMENT' | 'CUSTOM';

export interface PortfolioSectionDto {
  id: string;
  portfolioId: string;
  type: PortfolioSectionType;
  title: string;
  content: string;  // 마크다운 또는 플레인 텍스트
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioDto {
  id: string;
  userId: string;
  title: string;
  templateId: string;   // 'basic' | 'modern' | 'minimal'
  versionLabel: string; // '마케팅용 v1', '기획용 v2' 등
  sections: PortfolioSectionDto[];
  createdAt: string;
  updatedAt: string;
}
```

**`packages/shared/src/schemas/portfolio.schema.ts`**

아래 Zod 스키마를 정의한다:

```typescript
import { z } from 'zod';

export const CreatePortfolioSchema = z.object({
  title: z.string().min(1).max(100),
  templateId: z.string().min(1),
  versionLabel: z.string().min(1).max(50),
});

export const UpdatePortfolioSchema = CreatePortfolioSchema.partial();

export const CreatePortfolioSectionSchema = z.object({
  type: z.enum(['INTRO', 'PROJECT', 'SKILLS', 'ACHIEVEMENT', 'CUSTOM']),
  title: z.string().min(1).max(100),
  content: z.string(),
  order: z.number().int().min(0),
});

export const UpdatePortfolioSectionSchema = CreatePortfolioSectionSchema.partial();

export type CreatePortfolioInput = z.infer<typeof CreatePortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof UpdatePortfolioSchema>;
export type CreatePortfolioSectionInput = z.infer<typeof CreatePortfolioSectionSchema>;
export type UpdatePortfolioSectionInput = z.infer<typeof UpdatePortfolioSectionSchema>;
```

### 수정할 파일

**`packages/shared/src/index.ts`**

포트폴리오 타입과 스키마를 export에 추가한다:

```typescript
export * from './types/portfolio';
export * from './schemas/portfolio.schema';
```

## Acceptance Criteria

```bash
cd packages/shared && pnpm build
# 타입 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - `packages/shared/src/types/portfolio.ts`가 생성되었는가?
   - `packages/shared/src/schemas/portfolio.schema.ts`가 생성되었는가?
   - `packages/shared/src/index.ts`에 export가 추가되었는가?
   - `pnpm build`가 에러 없이 통과하는가?
3. 성공 시 `phases/phase3-a-portfolio/index.json`의 step 0를 업데이트한다:
   - `"status": "completed"`, `"summary": "PortfolioDto, PortfolioSectionDto 타입 및 Zod 스키마 packages/shared에 추가"`

## 금지사항

- career-description.ts의 타입을 수정하지 마라. 이유: 기존 기능에 영향을 준다.
- prisma schema를 수정하지 마라. 이유: Portfolio 모델이 이미 존재한다.
