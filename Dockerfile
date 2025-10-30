FROM node:18-alpine AS base

ARG RESEND_API_KEY 
ENV RESEND_API_KEY=$RESEND_API_KEY

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat

# Install libheif WITH decoder plugins for HEIC support
RUN apk add --no-cache libheif libheif-dev vips-dev libde265 libde265-dev

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Force install ioredis if missing
RUN npm list ioredis || npm install ioredis@5.8.0

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install FFmpeg, libheif AND decoder at runtime
RUN apk add --no-cache ffmpeg libheif libde265

COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy ALL node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
CMD ["node", "server.js"]