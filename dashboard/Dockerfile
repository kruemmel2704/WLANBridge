# Multi-stage Dockerfile für minimales Next.js Dashboard
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN mkdir -p public
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Tools für Ping, WLAN- & Netzwerk-Diagnose installieren
RUN apk add --no-cache \
    iputils \
    iproute2 \
    iw \
    wireless-tools

# Next.js Standalone Build übernehmen
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]

