# 명령어

```bash
# 설치
pnpm install

# 전체 개발 서버
pnpm dev
# web: http://localhost:3000
# api: http://localhost:3001

# 빌드
pnpm build

# 테스트
pnpm test           # 전체
pnpm test --watch   # 워치 모드

# 린트
pnpm lint
pnpm lint --fix

# DB
cd apps/api
npx prisma migrate dev    # 마이그레이션
npx prisma studio         # DB GUI

# Docker
docker-compose up -d          # 전체 실행
docker-compose up -d db       # DB만 실행
docker-compose down           # 중지
docker-compose logs -f api    # 로그 확인
```