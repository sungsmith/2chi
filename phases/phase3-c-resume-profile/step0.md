# Step 0: shared-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/packages/shared/src/types/experience.ts` — ExperienceDto 타입 확인 (재사용할 것)
- `/packages/shared/src/index.ts` — export 패턴 확인
- `/apps/api/prisma/schema.prisma` — ResumeProfile 모델 확인

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

`packages/shared/src/` 아래에 이력 프로필 타입과 Zod 스키마를 추가한다.

### 생성할 파일

**`packages/shared/src/types/resume-profile.ts`**

```typescript
import { ExperienceDto } from './experience';

export interface ResumeProfileDto {
  id: string;
  userId: string;
  name: string;          // '마케팅용', '기획용 v2' 등
  description: string;   // 이 프로필의 목적 설명
  selectedExperienceIds: string[];  // 선택된 Experience ID 목록
  experiences?: ExperienceDto[];    // populate 시 포함 (findOne에서 반환)
  createdAt: string;
  updatedAt: string;
}
```

**`packages/shared/src/schemas/resume-profile.schema.ts`**

```typescript
import { z } from 'zod';

export const CreateResumeProfileSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).default(''),
  selectedExperienceIds: z.array(z.string()).min(1, '최소 1개 이상의 경험을 선택해야 합니다'),
});

export const UpdateResumeProfileSchema = CreateResumeProfileSchema.partial();

export type CreateResumeProfileInput = z.infer<typeof CreateResumeProfileSchema>;
export type UpdateResumeProfileInput = z.infer<typeof UpdateResumeProfileSchema>;
```

### 수정할 파일

**`packages/shared/src/index.ts`**

resume-profile 타입과 스키마를 export에 추가:

```typescript
export * from './types/resume-profile';
export * from './schemas/resume-profile.schema';
```

## Acceptance Criteria

```bash
cd packages/shared && pnpm build
# 타입 에러 없음
```

## 검증 절차

1. AC 커맨드를 실행한다.
2. 체크리스트:
   - `packages/shared/src/types/resume-profile.ts`가 생성되었는가?
   - `packages/shared/src/schemas/resume-profile.schema.ts`가 생성되었는가?
   - `packages/shared/src/index.ts`에 export가 추가되었는가?
3. 성공 시 `phases/phase3-c-resume-profile/index.json`의 step 0을 업데이트한다:
   - `"status": "completed"`, `"summary": "ResumeProfileDto 타입 및 Zod 스키마 packages/shared에 추가"`

## 금지사항

- ExperienceDto를 재정의하지 마라. 이유: `packages/shared/src/types/experience.ts`에 이미 있다. import해서 사용한다.
- prisma schema를 수정하지 마라. 이유: ResumeProfile 모델이 이미 존재한다.
