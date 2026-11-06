import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from "@supabase/supabase-js";
import { beforeAll, describe, expect, test, vi } from "vitest";

// Start's request helpers only load inside its Vite plugin, and these tests
// don't touch a request.
vi.mock("@tanstack/solid-start/server", () => ({}));

// supabase.server reads these at import time.
vi.stubEnv("VITE_SUPABASE_URL", "http://localhost:9001");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "test-key");

let mod: typeof import("./supabase.server");
beforeAll(async () => {
  mod = await import("./supabase.server");
});

const networkDown = new AuthRetryableFetchError("fetch failed", 0);
const gatewayTimeout = new AuthRetryableFetchError("Gateway Timeout", 504);
const rateLimited = new AuthApiError("Too many requests", 429, "over_request_rate_limit");
const serverError = new AuthApiError("Internal error", 500, "unexpected_failure");
const tokenReused = new AuthApiError("Invalid Refresh Token", 400, "refresh_token_already_used");
const sessionGone = new AuthApiError("Session not found", 403, "session_not_found");

describe("isTransientAuthError", () => {
  test.each([networkDown, gatewayTimeout, rateLimited, serverError])(
    "treats $message ($status) as transient",
    (error) => {
      expect(mod.isTransientAuthError(error)).toBe(true);
    },
  );

  test.each([tokenReused, sessionGone, new AuthSessionMissingError()])(
    "treats $message as a definitive logout",
    (error) => {
      expect(mod.isTransientAuthError(error)).toBe(false);
    },
  );

  test("treats a missing error as not transient", () => {
    expect(mod.isTransientAuthError(null)).toBe(false);
  });
});
