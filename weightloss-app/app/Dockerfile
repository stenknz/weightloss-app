FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /build
COPY --from=deps /build/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=7673
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1000 -S app \
    && adduser -S -u 1000 -G app app \
    && apk add --no-cache wget

COPY --from=builder --chown=app:app /build/.next/standalone ./
COPY --from=builder --chown=app:app /build/.next/static ./.next/static
COPY --from=builder --chown=app:app /build/public ./public
COPY --from=builder --chown=app:app /build/lib/schema.sql ./lib/schema.sql

USER app

EXPOSE 7673

HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=30s \
  CMD wget -qO- http://127.0.0.1:7673/api/health || exit 1

CMD ["node", "server.js"]
