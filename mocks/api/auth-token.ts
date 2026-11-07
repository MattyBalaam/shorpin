// The mock's access tokens are JWT-shaped, so supabase-js's getClaims() can
// decode them. They're HS256 with no `kid` (and an unchecked signature):
// getClaims() then can't verify them locally, and falls back to getUser(),
// which the mock answers (see auth/v1/index.ts). Real projects sign with
// ES256 keys and verify locally.

function base64url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function makeAccessToken(user: { id: string; email: string }, expiresAt: number) {
  const header = base64url({ alg: "HS256", typ: "JWT" });
  const payload = base64url({
    sub: user.id,
    email: user.email,
    aud: "authenticated",
    role: "authenticated",
    exp: expiresAt,
  });
  return `${header}.${payload}.mock-signature`;
}

/** The signed-in user's email, from the request's bearer token. */
export function emailFromRequest(request: Request): string | null {
  const token = (request.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const { email } = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      email?: unknown;
    };
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}
