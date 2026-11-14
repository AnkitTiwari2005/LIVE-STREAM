# ==============================================================================
# Multi-stage Dockerfile for NestJS Backend, Worker & Migration Runner
# ==============================================================================
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# --- Dependencies Stage ---
FROM base AS dependencies
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install

# --- Builder Stage ---
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Target: Migration Runner (pooja_migrate) ---
FROM base AS migrate
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY prisma ./prisma
COPY package.json ./
CMD ["npx", "prisma", "migrate", "deploy"]

# --- Target: Production Runtime (pooja_api and pooja_worker) ---
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /app/public/uploads /app/storage/kyc /app/public/client && chown -R node:node /app

USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
