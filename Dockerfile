# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# Production Multi-Stage Host-Agnostic Dockerfile for TrillionSkill
# Node: 22 (Debian Bookworm Slim)
# -----------------------------------------------------------------------------

FROM node:25-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# 1. Install all dependencies (including dev for building)
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci --ignore-scripts && npx prisma generate

# 2. Build Next.js application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_STANDALONE=true
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy build-time variables (never baked into final runner image)
ENV AUTH_SECRET="build_dummy_auth_secret_placeholder"
ENV DATABASE_URL="postgresql://placeholder:placeholder@127.0.0.1:54329/placeholder_build_test"
ENV DIRECT_URL="postgresql://placeholder:placeholder@127.0.0.1:54329/placeholder_build_test"
RUN npx prisma generate && npm run build

# 3. Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 -g nodejs nextjs

# Copy standalone output and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT:-3000}/api/health || exit 1

CMD ["node", "server.js"]
