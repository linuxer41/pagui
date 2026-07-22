FROM oven/bun:1.3 AS base
WORKDIR /app

FROM base AS deps
COPY backend/package.json backend/bun.lock ./
COPY shared /app/shared
RUN bun install --frozen-lockfile --production

FROM base AS builder
COPY backend/package.json backend/bun.lock ./
COPY shared /app/shared
RUN bun install --frozen-lockfile
COPY backend/tsconfig.json ./
COPY backend/src/ ./src/
RUN bun run build

FROM oven/bun:1.3-slim AS runner
WORKDIR /app

RUN apt-get update -qq && apt-get install -y -qq curl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY --from=builder /app/dist ./dist
COPY backend/schema.sql ./schema.sql

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=15s \
  CMD curl -f http://localhost:3000/health || exit 1

USER bun
CMD ["bun", "run", "dist/index.js"]
