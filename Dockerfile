# syntax=docker/dockerfile:1

# ---- Build stage: the browser assets (one stylesheet, a few small scripts,
# the service worker). The server is plain TypeScript run by Node, so there's
# nothing of it to build.
FROM node:24-alpine AS builder

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---- Runtime stage ----
FROM node:24-alpine

RUN corepack enable
RUN apk add --no-cache wget

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY server ./server
COPY lib ./lib
COPY --from=builder /app/dist ./dist

# The server reads these at runtime. CI still passes them as build args (as
# it did when they were baked into the React client bundle), so they become
# the image's defaults; a runtime env var of the same name wins. The
# Supabase key is the publishable one, safe to keep in an image.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ARG VITE_GIT_HASH
ARG VITE_GIT_DATE
ARG VITE_PR_NUMBER
ARG VITE_BRANCH
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY \
    VITE_GIT_HASH=$VITE_GIT_HASH \
    VITE_GIT_DATE=$VITE_GIT_DATE \
    VITE_PR_NUMBER=$VITE_PR_NUMBER \
    VITE_BRANCH=$VITE_BRANCH \
    NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/index.ts"]
