# Step 7: phase1-final-validation

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `phases/phase1-a-foundation-auth/index.json`
- `phases/phase1-b-experience/index.json`
- `phases/phase1-c-cover-letter/index.json`
- `phases/phase1-d-applications-calendar/index.json`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 작업

Phase 1 전체(A, B, C, D)의 최종 검증을 수행한다. 모든 e2e 테스트가 통과하고, 린트 에러가 없으며, 개발 서버에서 황금 경로가 동작하는지 확인한다.

### Step 1: API 전체 테스트 실행

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json --no-coverage
```

Expected: 모든 테스트 통과 (auth, experiences, cover-letters, applications).

실패 시: 실패한 테스트를 분석하고 수정 후 재실행.

### Step 2: 웹 테스트 실행

```bash
cd apps/web && pnpm test
```

Expected: 모든 테스트 통과.

### Step 3: 타입 체크 및 린트

```bash
cd packages/shared && pnpm build && cd ../apps/api && pnpm lint && cd ../web && pnpm lint
```

Expected: 에러 없음.

### Step 4: 개발 서버 전체 플로우 최종 확인

```bash
docker-compose up -d db redis
pnpm dev
```

황금 경로 (Golden Path) 확인:
1. 회원가입 → 대시보드 (이력/자소서/지원 수 표시)
2. 이력 추가 (STAR 작성)
3. 채용공고 붙여넣기 → 공고 분석 → 자소서 생성 → 항목 추가
4. 지원 추가 → 보드에 카드 → 캘린더 탭에서 마감일 확인
5. 로그아웃 → 재로그인

### Step 5: 최종 커밋

```bash
git add .
git commit -m "feat: complete Phase 1 MVP - auth, experience, cover letter, applications, calendar"
```

## Acceptance Criteria

```bash
cd apps/api && npx jest --config ./test/jest-e2e.json --no-coverage && cd ../web && pnpm lint
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - Phase 1-A, B, C, D의 모든 index.json이 `"status": "completed"`인가?
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/phase1-d-applications-calendar/index.json`의 해당 step을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "Phase 1 전체 검증 완료"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 (API 키, 외부 인증, 수동 설정 등) → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step에서 새로운 기능을 추가하지 마라
- 기존 테스트가 실패하면 원인을 분석 후 최소한의 수정만 가하라
- 환경 변수(.env)를 git에 커밋하지 마라
