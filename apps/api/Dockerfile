# ──────────────────────────────────────────────
# Stage: base
# ──────────────────────────────────────────────
FROM node:20-alpine AS base
RUN npm install -g pnpm turbo
WORKDIR /app

# ──────────────────────────────────────────────
# Stage: deps — 의존성만 설치 (캐시 레이어 분리)
# ──────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────
# Stage: development — 핫리로드 개발 서버
# ──────────────────────────────────────────────
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
WORKDIR /app
EXPOSE 3001
# 컨테이너 실행 시 docker-compose command 로 override

# ──────────────────────────────────────────────
# Stage: builder — 프로덕션 빌드
# ──────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter api build
RUN pnpm --filter api prisma generate

# ──────────────────────────────────────────────
# Stage: production — 최소 이미지
# ──────────────────────────────────────────────
FROM node:20-alpine AS production
RUN npm install -g pnpm
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
