# syntax=docker/dockerfile:1

# Builds one app of the monorepo. APP names its folder in apps/ (README
# "Monorepo"); each Coolify app sets it as a build variable. Build from the
# repo root, so the shared packages and the lockfile are in the context.
ARG APP=react-router

# ---- Build stage ----
FROM node:24-alpine AS builder

RUN corepack enable

WORKDIR /repo

# Downloads every dependency in the lockfile into the store, so this layer
# stays cached until the lockfile changes, whatever the source does.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm fetch

COPY . .

ARG APP
RUN pnpm install --offline --frozen-lockfile --filter "@shorpin/${APP}..."

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
# Coolify PR previews set this to `build:preview`, which runs the MSW mock
# backend inside the server so previews never touch the real Supabase project.
# Optional for previews: the e2e test project's URL and publishable key, for
# app versions that offer it at login beside the mock.
ARG BUILD_SCRIPT=build
ARG VITE_TEST_SUPABASE_URL
ARG VITE_TEST_SUPABASE_PUBLISHABLE_DEFAULT_KEY

RUN pnpm --filter "@shorpin/${APP}" run "$BUILD_SCRIPT"

# The app's own folder (its package.json `files`) with a flat node_modules of
# just its dependencies. Preview builds keep dev dependencies, because the
# server imports msw at runtime there. Production stays --prod.
RUN if [ "$BUILD_SCRIPT" = "build" ]; then \
      pnpm --filter "@shorpin/${APP}" deploy --prod /app; \
    else \
      pnpm --filter "@shorpin/${APP}" deploy /app; \
    fi

# ---- Runtime stage ----
FROM node:24-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY --from=builder /app ./

EXPOSE 3000

# npm rather than pnpm: the deployed package.json has no packageManager
# field, so corepack would download pnpm on every start.
CMD ["npm", "start"]
