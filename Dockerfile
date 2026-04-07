# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:24-alpine AS builder

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Vite bakes these into the client bundle at build time
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ARG VITE_GIT_HASH
ARG VITE_GIT_DATE
ARG VITE_PR_NUMBER
ARG VITE_BRANCH

RUN pnpm build

# ---- Runtime stage ----
FROM node:24-alpine

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/build ./build
COPY --from=builder /instrument.server.mjs ./instrument.server.mjs

EXPOSE 3000

CMD ["pnpm", "start"]
