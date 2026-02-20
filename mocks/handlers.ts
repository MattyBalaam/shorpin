import { http, HttpResponse } from "msw";
import { users, lists, listItems, listMembers, waitlist } from "./db";

function emailFromRequest(request: Request): string | null {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  return token || null;
}

function makeSession(user: { id: string; email: string }) {
  return {
    access_token: user.email, // email IS the token in mock-land
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

export const handlers = [
  // ── Auth ────────────────────────────────────────────────────────────────

  http.post("*/auth/v1/token", async ({ request }) => {
    const url = new URL(request.url);
    const grantType = url.searchParams.get("grant_type");

    if (grantType === "refresh_token") {
      const body = (await request.json()) as { refresh_token: string };
      const email = body.refresh_token.replace("refresh-", "");
      const user = users.findFirst((q) => q.where({ email }));
      if (!user) return HttpResponse.json({ error: "Invalid refresh token" }, { status: 400 });
      return HttpResponse.json(makeSession(user));
    }

    // password grant
    const body = (await request.json()) as { email: string };
    const user = users.findFirst((q) => q.where({ email: body.email }));
    if (!user) {
      return HttpResponse.json({ error: "Invalid login credentials" }, { status: 400 });
    }
    return HttpResponse.json(makeSession(user));
  }),

  http.get("*/auth/v1/user", ({ request }) => {
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

  http.post("*/auth/v1/logout", () => new HttpResponse(null, { status: 204 })),

  // ── Database ─────────────────────────────────────────────────────────────

  http.head("*/rest/v1/waitlist", () => {
    const count = waitlist.count();
    return new HttpResponse(null, {
      headers: { "Content-Range": `0-0/${count}` },
    });
  }),

  http.get("*/rest/v1/lists", ({ request }) => {
    const url = new URL(request.url);
    const email = emailFromRequest(request);
    const user = email ? users.findFirst((q) => q.where({ email })) : null;
    if (!user) return HttpResponse.json([], { status: 401 });

    // Single list by slug — used by the list detail page (embeds list_items)
    const slugParam = url.searchParams.get("slug")?.replace("eq.", "");
    if (slugParam) {
      const list = lists.findFirst((q) =>
        q.where({ slug: slugParam, state: "active" })
      );
      if (!list) return HttpResponse.json(null, { status: 406 });

      const items = listItems
        .findMany((q) => q.where({ list_id: list.id }))
        .sort((a, b) => a.sort_order - b.sort_order);

      return HttpResponse.json({ ...list, list_items: items });
    }

    // All accessible lists — used by the home page
    const ownedLists = lists.findMany((q) =>
      q.where({ user_id: user.id, state: "active" })
    );

    const memberships = listMembers.findMany((q) =>
      q.where({ user_id: user.id })
    );
    const memberListIds = new Set(memberships.map((m) => m.list_id));
    const sharedLists = lists
      .findMany((q) => q.where({ state: "active" }))
      .filter((l) => memberListIds.has(l.id) && l.user_id !== user.id);

    return HttpResponse.json([...ownedLists, ...sharedLists]);
  }),

  http.get("*/rest/v1/profiles", ({ request }) => {
    const email = emailFromRequest(request);
    const user = email ? users.findFirst((q) => q.where({ email })) : null;
    if (!user) return HttpResponse.json([], { status: 401 });

    const allUsers = users.findMany((q) => q.where({ id: (id) => id !== user.id }));
    return HttpResponse.json(allUsers.map((u) => ({ id: u.id, email: u.email })));
  }),

  http.get("*/rest/v1/list_members", ({ request }) => {
    const url = new URL(request.url);
    const listId = url.searchParams.get("list_id")?.replace("eq.", "") ?? "";
    const members = listMembers.findMany((q) => q.where({ list_id: listId }));
    return HttpResponse.json(members);
  }),
];
