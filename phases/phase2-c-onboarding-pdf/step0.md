# Step 0: shared-onboarding-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `docs/ARCHITECTURE.md`
- `packages/shared/src/types/experience.ts` — ExperienceType, ExperienceDto 구조 확인
- `packages/shared/src/index.ts`
- `apps/api/prisma/schema.prisma` — Experience 모델 필드 확인

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

온보딩 PDF/Word 파싱에 필요한 타입과 Zod 스키마를 추가한다.

### 생성할 파일

#### `packages/shared/src/types/onboarding.ts`

```typescript
import { ExperienceType } from './experience';

export interface ParsedExperience {
  title: string;
  type: ExperienceType;  // 'WORK' | 'PROJECT' | 'ACTIVITY' | 'EDUCATION'
  companyName?: string;
  startDate?: string;    // 'YYYY-MM' 형식
  endDate?: string;      // 'YYYY-MM' 또는 'present'
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  resultMetric?: string;
  tags?: string[];
}

export interface OnboardingParseResultDto {
  parseId: string;                   // 임시 ID (TTL 30분)
  experiences: ParsedExperience[];
  rawText: string;                   // 추출된 원본 텍스트 (사용자 검토용)
  confidence: number;                // AI 파싱 신뢰도 0-100
}
```

#### `packages/shared/src/schemas/onboarding.schema.ts`

```typescript
import { z } from 'zod';

export const confirmOnboardingSchema = z.object({
  parseId: z.string().min(1),
  experiences: z.array(z.object({
    title: z.string().min(1, '제목을 입력하세요.').max(100),
    type: z.enum(['WORK', 'PROJECT', 'ACTIVITY', 'EDUCATION']),
    companyName: z.string().max(100).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    situation: z.string().max(2000).optional(),
    task: z.string().max(2000).optional(),
    action: z.string().max(2000).optional(),
    result: z.string().max(2000).optional(),
    resultMetric: z.string().max(500).optional(),
    tags: z.array(z.string()).optional(),
  })).min(1, '저장할 경험을 1개 이상 선택하세요.'),
});

export type ConfirmOnboardingInput = z.infer<typeof confirmOnboardingSchema>;
```

### 수정할 파일

#### `packages/shared/src/index.ts`

새 파일들을 export에 추가한다.

## Acceptance Criteria

```bash
cd packages/shared && pnpm build
# 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `ParsedExperience.type`이 기존 `ExperienceType`을 재사용하는가? (재정의 금지)
   - `OnboardingParseResultDto`가 DB 모델이 아닌 DTO 인터페이스인가?
3. 결과에 따라 `phases/phase2-c-onboarding-pdf/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "ParsedExperience, OnboardingParseResultDto, confirmOnboardingSchema 추가 완료"`
   - 실패 3회 → `"status": "error"`, `"error_message": "구체적 에러"`

## 금지사항

- `ExperienceType`을 재정의하지 마라. 이유: `packages/shared/src/types/experience.ts`에 이미 정의되어 있으며 중복 정의는 타입 불일치를 유발한다.
- `OnboardingParseResultDto`를 DB 스키마처럼 설계하지 마라. 이유: 파싱 결과는 임시 데이터이며 Redis/메모리 캐시에만 존재한다.
- `apps/api` 또는 `apps/web` 파일을 수정하지 마라.
