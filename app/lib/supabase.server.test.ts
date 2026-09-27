import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  type AuthError,
} from "@supabase/supabase-js";
import { beforeAll, describe, expect, test, vi } from "vitest";

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

describe("requireUser", () => {
  const clientReturning = (error: AuthError) =>
    ({
      auth: { getUser: async () => ({ data: { user: null }, error }) },
    }) as unknown as Parameters<typeof mod.requireUser>[0];

  async function thrownBy(error: AuthError) {
    try {
      await mod.requireUser(clientReturning(error));
    } catch (thrown) {
      return thrown as Response;
    }
    throw new Error("requireUser did not throw");
  }

  test("serves 503, not a login redirect, when auth is unreachable", async () => {
    const response = await thrownBy(networkDown);
    expect(response.status).toBe(503);
  });

  test("redirects to login when the session is definitively gone", async () => {
    const response = await thrownBy(sessionGone);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });
});
