import { delay, HttpResponse, http } from "msw";
import { users } from "../../../db.ts";

function emailFromRequest(request: Request): string | null {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  return token || null;
}

function makeSession(user: { id: string; email: string }) {
  return {
    access_token: user.email,
    refresh_token: `refresh-${user.email}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: user.id,
      email: user.email,
      aud: "authenticated",
      role: "authenticated",
    },
  };
}

export const authHandlers = [
  http.post("*/auth/v1/token", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const grantType = url.searchParams.get("grant_type");

    if (grantType === "refresh_token") {
      const body = (await request.json()) as { refresh_token: string };
      const email = body.refresh_token.replace("refresh-", "");
      const user = users.findFirst((q) => q.where({ email }));
      if (!user) return HttpResponse.json({ error: "Invalid refresh token" }, { status: 400 });
      return HttpResponse.json(makeSession(user));
    }

    const body = (await request.json()) as { email: string };
    const user = users.findFirst((q) => q.where({ email: body.email }));
    if (!user) {
      return HttpResponse.json({ error: "Invalid login credentials" }, { status: 400 });
    }
    return HttpResponse.json(makeSession(user));
  }),

  http.get("*/auth/v1/user", async ({ request }) => {
    await delay();
    const email = emailFromRequest(request);
    if (!email) return HttpResponse.json({ message: "JWT expired" }, { status: 401 });
    const user = users.findFirst((q) => q.where({ email }));
    if (!user) return HttpResponse.json({ message: "JWT expired" }, { status: 401 });
    return HttpResponse.json({
      id: user.id,
      email: user.email,
      aud: "authenticated",
      role: "authenticated",
    });
  }),

  http.post("*/auth/v1/logout", async () => {
    await delay();
    return new HttpResponse(null, { status: 204 });
  }),
];
