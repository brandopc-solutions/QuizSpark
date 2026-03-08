# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Generate Prisma client for PostgreSQL
RUN npx prisma generate
# Compile TypeScript
RUN npm run build

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output
COPY --from=builder /app/dist ./dist
# Copy generated Prisma client (needs native binaries)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
# Copy prisma schema (needed by db push)
COPY prisma ./prisma

EXPOSE 3000

# Push schema to DB then start the app
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
