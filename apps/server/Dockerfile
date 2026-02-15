FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
WORKDIR /app

# ── Install all deps ──────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
RUN pnpm install

# ── Build shared package ──────────────────────────────────────────────────────
FROM deps AS build-shared
COPY packages/shared ./packages/shared
RUN cd packages/shared && npx tsc || true

# ── Production runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/shared ./packages/shared
COPY apps/server/package.json ./apps/server/

# Install prod deps
RUN pnpm install --prod

# Copy server source files
COPY apps/server/src ./apps/server/src
COPY apps/server/drizzle.config.ts ./apps/server/
COPY apps/server/migrate.ts ./apps/server/
COPY apps/server/drizzle ./apps/server/drizzle

# Install tsx globally
RUN npm install -g tsx

EXPOSE 3000
CMD ["tsx", "apps/server/src/index.ts"]
