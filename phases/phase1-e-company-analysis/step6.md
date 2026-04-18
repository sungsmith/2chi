# Step 6: plan-e-validation

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `phases/phase1-e-company-analysis/index.json`
- `phases/phase1-a-foundation-auth/index.json`
- `phases/phase1-b-experience/index.json`
- `phases/phase1-c-cover-letter/index.json`
- `phases/phase1-d-applications-calendar/index.json`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Phase 1-E 전체의 최종 검증을 수행한다. 코드 리뷰어 서브에이전트로 구현 품질을 검증하고, 전체 e2e 테스트가 통과하는지 확인한다.

**IMPORTANT:** 이 Step은 반드시 Phase 1-E 구현에 참여하지 않은 **별도의 코드 리뷰어 에이전트**가 수행한다. 구현을 담당한 에이전트는 자신의 코드를 직접 검증하지 않는다.

### Step 1: 코드 리뷰어 에이전트 호출

`superpowers:requesting-code-review` 스킬을 invoke하고 아래 내용으로 리뷰 요청:

```
검토 대상:
- packages/shared/src/types/company.ts
- packages/shared/src/schemas/company.schema.ts
- apps/api/src/ai/prompts/company.prompt.ts
- apps/api/src/ai/prompts/matching.prompt.ts
- apps/api/src/ai/ai.service.ts (analyzeCompany, calculateMatchingScore 메서드)
- apps/api/src/companies/ (전체)
- apps/api/src/cover-letters/cover-letters.service.ts (calculateMatching 메서드)
- apps/api/src/cover-letters/cover-letters.controller.ts (GET /:id/matching 엔드포인트)
- apps/web/hooks/use-companies.ts
- apps/web/app/company/ (전체)
- apps/web/components/company/ (전체)
- apps/web/components/cover-letter/matching-score-badge.tsx

체크리스트:
- CLAUDE.md CRITICAL 규칙 준수 여부
- packages/shared 타입 사용 여부 (CompanyDto, AnalyzeCompanyInput, MatchingScoreDto)
- API 응답 형식 일관성 ({ success: true, data } / { success: false, error })
- 24시간 캐시 로직 정확성 (CACHE_TTL_MS = 24 * 60 * 60 * 1000)
- GPT-4o-mini 사용 확인 (기업 분석, 매칭도 계산 모두 gpt-4o-mini여야 함)
- 에러 핸들링 (OpenAI API 실패 시 처리, NotFoundException, ForbiddenException)
- 불필요한 any 타입 사용 여부
- E2E 테스트 커버리지 (list, analyze, cache reuse, get)
- 다른 유저 기업 정보 접근 차단 (ForbiddenException)
- Raw SQL 미사용 (Prisma만 사용)
```

### Step 2: API 전체 테스트 실행

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json --no-coverage
```

Expected: auth, experiences, cover-letters, applications, companies 모두 통과.

실패 시: 실패한 테스트를 분석하고 최소한의 수정 후 재실행. 수정 3회 초과 시 `"status": "error"` 처리.

**주의:** companies.e2e-spec.ts는 실제 OpenAI API를 호출한다. OPENAI_API_KEY가 유효하지 않으면 companies 테스트만 `"status": "blocked"` 처리하고 나머지 테스트 결과를 기록한다.

### Step 3: 린트 실행

```bash
cd packages/shared && pnpm build && cd /Users/sungjiwon/claude/2chi/apps/api && pnpm lint && cd ../web && pnpm lint
```

Expected: 에러 없음.

### Step 4: 최종 커밋

```bash
git add .
git commit -m "feat: complete Phase 1-E company analysis and matching score"
```

## Acceptance Criteria

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json --no-coverage && cd ../web && pnpm lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - Phase 1-E의 모든 이전 step index.json이 `"status": "completed"`인가?
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/phase1-e-company-analysis/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "Phase 1-E 전체 검증 완료"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - OPENAI_API_KEY 없음 → `"status": "blocked"`, `"blocked_reason": "유효한 OPENAI_API_KEY가 .env에 필요"` 후 즉시 중단

## 금지사항

- 이 step에서 새로운 기능을 추가하지 마라
- 기존 테스트가 실패하면 원인을 분석 후 최소한의 수정만 가하라
- 환경 변수(.env)를 git에 커밋하지 마라
- 구현을 담당한 에이전트가 자신의 코드를 직접 검증하지 마라 — 반드시 별도 에이전트가 수행한다
