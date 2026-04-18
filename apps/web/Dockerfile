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
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────
# Stage: development — 핫리로드 개발 서버
# ──────────────────────────────────────────────
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
WORKDIR /app
EXPOSE 3000
# 컨테이너 실행 시 docker-compose command 로 override

# ──────────────────────────────────────────────
# Stage: builder — 프로덕션 빌드 (Next.js standalone)
# ──────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web build

# ──────────────────────────────────────────────
# Stage: production — Next.js standalone 최소 이미지
# ──────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone output 복사
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
