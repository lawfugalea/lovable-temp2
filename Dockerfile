# ---- Builder ----
FROM node:20.19.0-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Copy deps manifests + PRISMA SCHEMA before npm ci (important!)
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps

# Copy rest and build Next.js (standalone output)
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runner (non-standalone; includes node_modules) ----
FROM node:20.19.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat

# Copy runtime deps & build output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# (Remove the prisma CLI copy and the entrypoint that ran prisma)
# We’ll run migrations manually once instead of on every boot.

EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]