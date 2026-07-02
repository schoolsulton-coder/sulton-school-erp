# ===== Builder =====
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Puppeteer Chromium'ni build vaqtida yuklamaymiz (runner'da tizim chromium ishlatamiz)
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# ===== Runner =====
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Chromium (shartnoma/vedomost PDF uchun) + Prisma uchun openssl
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation \
      openssl \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# devDeps ham kerak: prisma CLI (migrate deploy) va ts-node (seed)
RUN npm ci --include=dev

# Prisma sxema + klient generatsiya (runner platformasiga mos engine)
COPY prisma ./prisma
RUN npx prisma generate

# Qurilgan kod
COPY --from=builder /app/dist ./dist

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
CMD ["./docker-entrypoint.sh"]
