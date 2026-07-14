# Multi-stage Dockerfile for Next.js frontend (store-frontend)

FROM node:18 AS builder
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Store identity, inlined into the JS bundle by Next.js at build time.
# Supplied per-fork as --build-arg values from GitHub repo Variables (see RUNBOOK.md)
# — never hardcoded here or read from a committed .env file.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STORE_ID
ARG NEXT_PUBLIC_STORE_NAME
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STORE_ID=$NEXT_PUBLIC_STORE_ID
ENV NEXT_PUBLIC_STORE_NAME=$NEXT_PUBLIC_STORE_NAME

# Build
COPY . .
RUN npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm","start"]
