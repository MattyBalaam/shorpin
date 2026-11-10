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

# Coolify PR previews set this to `build:preview`, which also ships the
# preview settings (dist/runtime.env): the server then runs the MSW mock
# backend in-process, so previews never touch the real Supabase project.
ARG BUILD_SCRIPT=build
RUN pnpm run "$BUILD_SCRIPT"

# ---- Runtime stage ----
FROM node:24-alpine

RUN corepack enable
RUN apk add --no-cache wget

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
# Previews import msw (a dev dependency) at runtime, so they keep dev
# dependencies. Production stays --prod.
ARG BUILD_SCRIPT=build
RUN if [ "$BUILD_SCRIPT" = "build" ]; then \
      pnpm install --frozen-lockfile --prod; \
    else \
      pnpm install --frozen-lockfile; \
    fi

COPY server ./server
COPY lib ./lib
# Only previews import these (server/preview.ts).
COPY mocks ./mocks
COPY --from=builder /app/dist ./dist

# The server reads these at runtime. CI still passes them as build args (as
# it did when they were baked into the React client bundle), so they become
# the image's defaults; a runtime env var of the same name wins. The
# Supabase key is the publishable one, safe to keep in an image. Left unset
# (previews), they're empty, and the server falls back to dist/runtime.env.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ARG VITE_GIT_HASH
ARG VITE_GIT_DATE
ARG VITE_PR_NUMBER
ARG VITE_BRANCH
# Previews only, optional: the e2e test project, offered at login beside the
# mock (server/backend.ts). Its service role key (TEST_SUPABASE_SERVICE_ROLE_KEY)
# is deliberately not here: set it as a runtime variable, never a build arg.
ARG VITE_TEST_SUPABASE_URL
ARG VITE_TEST_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY \
    VITE_GIT_HASH=$VITE_GIT_HASH \
    VITE_GIT_DATE=$VITE_GIT_DATE \
    VITE_PR_NUMBER=$VITE_PR_NUMBER \
    VITE_BRANCH=$VITE_BRANCH \
    VITE_TEST_SUPABASE_URL=$VITE_TEST_SUPABASE_URL \
    VITE_TEST_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$VITE_TEST_SUPABASE_PUBLISHABLE_DEFAULT_KEY \
    NODE_ENV=production

EXPOSE 3000

CMD ["node", "server/index.ts"]
