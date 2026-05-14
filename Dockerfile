# Multi-stage Dockerfile for Next.js frontend (store-frontend)

FROM node:18 AS builder
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Build
COPY . .
RUN mkdir -p public
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
