# =============================================================================
# Multi-stage Dockerfile for the Next.js weight loss app
# Target: linux/amd64, linux/arm64 (ASUSTOR AS5404T is x86_64)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: install dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# -----------------------------------------------------------------------------
# Stage 2: build the Next.js app
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /build
COPY --from=deps /build/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: production runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create the directories that will be bind-mounted. They need to exist
# inside the image so that the non-root user can write to them at runtime
# if the bind mount is empty. The bind mount takes precedence at runtime.
RUN mkdir -p /app/data /app/logs /app/uploads /app/backups \
    && addgroup -g 1000 -S app \
    && adduser -S -u 1000 -G app app \
    && chown -R app:app /app \
    && apk add --no-cache wget

# Copy standalone server output
COPY --from=builder --chown=app:app /build/.next/standalone ./
# Copy static and public assets
COPY --from=builder --chown=app:app /build/.next/static ./.next/static
COPY --from=builder --chown=app:app /build/public ./public
# Copy the schema init script for runtime safety net (ensureSchema)
COPY --from=builder --chown=app:app /build/lib/schema.sql ./lib/schema.sql

# We intentionally do not set USER here: the docker-compose stack passes
# PUID/PGID and uses user: "${PUID}:${PGID}" so the container process
# matches the host user that owns the bind-mounted folders.
# If no PUID/PGID is provided, default to uid 1000.
USER 1000:1000

EXPOSE 3000

# Healthcheck is defined in docker-compose so it can use wget (installed in image).
HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=30s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
