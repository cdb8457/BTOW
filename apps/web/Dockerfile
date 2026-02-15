FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
WORKDIR /app

# ── Install deps ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# ── Build shared ──────────────────────────────────────────────────────────────
FROM deps AS build-shared
COPY packages/shared ./packages/shared
RUN pnpm --filter @btow/shared build 2>/dev/null || true

# ── Build web (Vite) ──────────────────────────────────────────────────────────
FROM build-shared AS build
COPY apps/web ./apps/web

# These are baked into the static build — must match your deployment
ARG VITE_API_URL=http://localhost:3000/api
ARG VITE_WS_URL=http://localhost:3000
ARG VITE_LIVEKIT_URL=ws://localhost:7880

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_LIVEKIT_URL=$VITE_LIVEKIT_URL

RUN pnpm --filter @btow/web build

# ── Serve with nginx ──────────────────────────────────────────────────────────
FROM nginx:alpine AS runner
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
