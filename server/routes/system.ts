import { Hono } from "hono";
import { env } from "../env.ts";
import type { AppEnv } from "../supabase.ts";

export const system = new Hono<AppEnv>();

// Liveness only: a Supabase blip shouldn't get the container restarted.
system.get("/health", (c) => c.text("ok"));

system.get("/version", (c) =>
  c.json({
    hash: env.gitHash,
    shortHash: env.gitHash.slice(0, 7),
    date: env.gitDate,
    pr: env.prNumber ? `https://github.com/MattyBalaam/shorpin/pull/${env.prNumber}` : null,
    branch: env.branch,
    commits: `https://github.com/MattyBalaam/shorpin/commits/${env.branch ?? env.gitHash}`,
  }),
);
