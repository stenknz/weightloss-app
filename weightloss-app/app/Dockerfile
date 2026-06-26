FROM node:20-slim AS builder
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund --ignore-scripts
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=7673
ENV HOSTNAME=0.0.0.0

RUN apt-get update -qq && apt-get install -y -qq wget && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/.next/standalone ./
COPY --from=builder /build/.next/static ./.next/static
COPY --from=builder /build/public ./public
COPY --from=builder /build/lib/schema.sql ./lib/schema.sql

EXPOSE 7673

HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=30s \
  CMD wget -qO- http://127.0.0.1:7673/api/health || exit 1

CMD ["node", "server.js"]
