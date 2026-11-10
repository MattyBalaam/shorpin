# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:24-alpine AS builder

RUN corepack enable

WORKDIR /app

# patches/ holds pnpm patches (patchedDependencies), which install applies.
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

COPY . .

# Vite bakes these into the client bundle at build time
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
# Without this the client Sentry.init() gets an undefined DSN and silently
# does nothing. The server reads VITE_SENTRY_DSN at runtime instead (see
# instrument.server.mjs), so it must also be set as a runtime variable.
ARG VITE_SENTRY_DSN
ARG VITE_GIT_HASH
ARG VITE_GIT_DATE
ARG VITE_PR_NUMBER
ARG VITE_BRANCH
# Coolify PR previews set BUILD_SCRIPT to `build:preview`, which runs the MSW
# mock backend inside the server so previews never touch the real Supabase
# project. Set VITE_TEST_SUPABASE_* too and the login page offers the e2e
# test project as well (src/lib/supabase-backend.ts). The runtime stage needs
# nothing extra: Nitro traces msw into .output for preview builds.
ARG BUILD_SCRIPT=build
ARG VITE_TEST_SUPABASE_URL
ARG VITE_TEST_SUPABASE_PUBLISHABLE_DEFAULT_KEY
# Source map upload (vite.config.ts). The token is a BuildKit secret, not a
# build arg, so it isn't recorded in the image's history. Without it the
# build skips the upload.
ARG SENTRY_ORG

RUN --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN pnpm run "$BUILD_SCRIPT"

# ---- Runtime stage ----
# Nitro's .output is self-contained: the server bundle, the static files,
# and the few packages it keeps outside the bundle (Sentry, traced into
# .output/server/node_modules). No install needed.
FROM node:24-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY --from=builder /app/.output ./.output

ENV NODE_ENV=production
EXPOSE 3000

# Same as `pnpm start`: Sentry's instrumentation loads before the server.
CMD ["node", "--import", "./.output/server/instrument.server.mjs", ".output/server/index.mjs"]
