# syntax=docker/dockerfile:1

# ---- Builder ----
FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=1

RUN apk add --no-cache libc6-compat

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# ---- Runner ----
FROM node:22-alpine AS runner
WORKDIR /app

ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV PUPPETEER_SKIP_DOWNLOAD=1

RUN apk add --no-cache libc6-compat \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/uploads/notes \
  && chown -R nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

# ---- Scheduled supermarket catalogue worker ----
FROM node:22-alpine AS price-worker
WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache ca-certificates chromium freetype harfbuzz nss ttf-freefont \
  && addgroup --system --gid 1002 priceworker \
  && adduser --system --uid 1002 --ingroup priceworker priceworker

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=priceworker:priceworker /app/scripts ./scripts

USER priceworker

CMD ["node", "scripts/sync-supermarket-prices.js"]
