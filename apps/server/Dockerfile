FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ── Install deps ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile

# ── Build shared ──────────────────────────────────────────────────────────────
FROM deps AS build-shared
COPY packages/shared ./packages/shared
RUN pnpm --filter @btow/shared build 2>/dev/null || true

# ── Build server ──────────────────────────────────────────────────────────────
FROM build-shared AS build
COPY apps/server ./apps/server
RUN pnpm --filter @btow/server build 2>/dev/null || \
    pnpm --filter @btow/server exec tsc --outDir dist --skipLibCheck 2>/dev/null || \
    pnpm --filter @btow/server exec tsx build.ts 2>/dev/null || true

# ── Production runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install production deps only
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
RUN pnpm install --frozen-lockfile --prod

# Copy built output
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/server/src ./apps/server/src
COPY --from=build /app/apps/server/drizzle.config.ts ./apps/server/drizzle.config.ts
COPY --from=build /app/apps/server/migrate.ts ./apps/server/migrate.ts
COPY --from=build /app/apps/server/drizzle ./apps/server/drizzle

# tsx for running TypeScript directly in production
RUN pnpm add -g tsx

EXPOSE 3000
CMD ["tsx", "apps/server/src/index.ts"]
