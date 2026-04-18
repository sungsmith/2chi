# Step 3: matching-endpoint

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/cover-letters/cover-letters.service.ts`
- `apps/api/src/cover-letters/cover-letters.controller.ts`
- `apps/api/src/cover-letters/cover-letters.module.ts`
- `apps/api/src/ai/ai.service.ts`
- `apps/api/src/experiences/experiences.service.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

기존 CoverLetters 모듈에 역량 매칭도 계산 엔드포인트를 추가한다. 채용공고의 필수 역량과 사용자 이력을 비교해 매칭도 점수(0~100)를 반환한다.

**수정할 파일:**
- `apps/api/src/cover-letters/cover-letters.service.ts`
- `apps/api/src/cover-letters/cover-letters.controller.ts`

### Step 1: CoverLettersService에 calculateMatching 추가

`apps/api/src/cover-letters/cover-letters.service.ts`에 다음 메서드를 클래스 내부에 추가한다.

**주의:** CoverLettersService는 이미 constructor에 `ExperiencesService`와 `AiService`가 주입되어 있어야 한다. 없다면 함께 추가하라.

```typescript
async calculateMatching(coverLetterId: string, userId: string) {
  const coverLetter = await this.findOne(coverLetterId, userId);
  const requiredCompetencies = (coverLetter.jobPosting as any)?.requiredCompetencies ?? [];

  if (!requiredCompetencies.length) {
    return { score: 0, matchedKeywords: [], missingKeywords: [], summary: '채용공고 역량 정보가 없습니다.' };
  }

  const experiences = await this.experiencesService.findAll(userId);
  const expData = experiences.map((e) => ({
    title: e.title,
    action: e.action,
    result: e.result,
    tags: (e.tags as any[]).map(({ tag }) => tag.name),
  }));

  const result = await this.aiService.calculateMatchingScore(requiredCompetencies, expData);

  // matchingScore DB 업데이트
  await this.prisma.coverLetter.update({
    where: { id: coverLetterId },
    data: { matchingScore: result.score },
  });

  return result;
}
```

### Step 2: CoverLettersController에 matching 엔드포인트 추가

`apps/api/src/cover-letters/cover-letters.controller.ts`에 다음 엔드포인트를 추가한다:

```typescript
@Get(':id/matching')
async calculateMatching(
  @Param('id') id: string,
  @CurrentUser() user: JwtPayload,
) {
  const data = await this.coverLettersService.calculateMatching(id, user.sub);
  return { success: true, data };
}
```

**주의:** `@Get(':id/matching')` 라우트는 반드시 `@Get(':id')` 보다 먼저 선언해야 NestJS 라우팅이 올바르게 동작한다.

### Step 3: 린트 실행

```bash
cd apps/api && pnpm lint
```

Expected: 에러 없음.

### Step 4: 커밋

```bash
git add apps/api/src/cover-letters/cover-letters.service.ts apps/api/src/cover-letters/cover-letters.controller.ts
git commit -m "feat(api): add competency matching score endpoint for cover letters"
```

## Acceptance Criteria

```bash
cd apps/api && pnpm lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR 기술 스택을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/phase1-e-company-analysis/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 다루지 않는 모듈·파일 수정 금지
- 기존 테스트를 깨뜨리지 마라
- Raw SQL 사용 금지. DB 쿼리는 모두 Prisma를 통해서만 한다
- 다른 유저의 자소서에 접근할 수 없도록 ForbiddenException 처리를 유지하라 (findOne에서 이미 처리됨)
- `calculateMatchingScore`는 반드시 GPT-4o-mini를 사용한다 (AiService에 이미 구현됨)
