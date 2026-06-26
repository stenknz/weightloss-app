FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ARG DATABASE_URL=postgres://p:p@localhost:5432/p
ENV NEXT_TELEMETRY_DISABLED=1 DATABASE_URL=$DATABASE_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=7673
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache wget

COPY --from=builder /build/.next/standalone ./
COPY --from=builder /build/.next/static ./.next/static
COPY --from=builder /build/public ./public
COPY --from=builder /build/lib/schema.sql ./lib/schema.sql

EXPOSE 7673

HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=30s \
  CMD wget -qO- http://127.0.0.1:7673/api/health || exit 1

CMD ["node", "server.js"]
