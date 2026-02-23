import { http, HttpResponse, delay } from "msw";
import { users, lists, listItems, listMembers, waitlist } from "./db.ts";
import { broadcastEmitter, type BroadcastMessage } from "./broadcast.ts";

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

    // password grant
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

  // ── Database ─────────────────────────────────────────────────────────────

  // Waitlist — HEAD for home page count
  http.head("*/rest/v1/waitlist", async () => {
    await delay();
    const count = waitlist.count();
    return new HttpResponse(null, {
      headers: { "Content-Range": `0-0/${count}` },
    });
  }),

  // Waitlist — GET for sign-ups page
  http.get("*/rest/v1/waitlist", async () => {
    await delay();
    const entries = waitlist.findMany();
    return HttpResponse.json(
      entries.map((e) => ({
        id: e.id,
        email: e.email,
        first_name: e.first_name ?? null,
        last_name: e.last_name ?? null,
        created_at: e.created_at ?? new Date().toISOString(),
      })),
    );
  }),

  // Waitlist — DELETE for sign-ups action
  http.delete("*/rest/v1/waitlist", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const idsParam = url.searchParams.get("id") ?? "";
    const inMatch = idsParam.match(/^in\.\((.+)\)$/);
    if (inMatch) {
      const ids = inMatch[1].split(",");
      ids.forEach((id) => waitlist.delete((q) => q.where({ id })));
    }
    return HttpResponse.json([]);
  }),

  // Lists — GET (home page all lists, single list by slug, slug prefix check)
  http.get("*/rest/v1/lists", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const email = emailFromRequest(request);
    const user = email ? users.findFirst((q) => q.where({ email })) : null;
    if (!user) return HttpResponse.json([], { status: 401 });

    const slugParam = url.searchParams.get("slug");

    // Slug prefix query — used by home action to check for slug conflicts.
    // Scoped to the requesting user so parallel test workers don't pollute
    // each other's slug namespace in the shared in-memory DB.
    if (slugParam?.startsWith("like.")) {
      const prefix = slugParam.slice(5).replace(/%$/, "");
      const matching = lists.findMany((q) =>
        q.where({
          state: "active",
          user_id: user.id,
          slug: (s: string) => s.startsWith(prefix),
        }),
      );
      return HttpResponse.json(matching.map((l) => ({ slug: l.slug })));
    }

    // Single list by slug — used by the list detail page (embeds list_items).
    // Scoped to the requesting user so parallel workers with the same slug
    // don't collide in the shared in-memory DB.
    if (slugParam?.startsWith("eq.")) {
      const slug = slugParam.slice(3);
      if (!user) return HttpResponse.json(null, { status: 401 });

      const memberships = listMembers.findMany((q) => q.where({ user_id: user.id }));
      const memberListIds = new Set(memberships.map((m) => m.list_id));
      const list =
        lists
          .findMany((q) => q.where({ slug, state: "active" }))
          .find((l) => l.user_id === user.id || memberListIds.has(l.id)) ?? null;
      if (!list) return HttpResponse.json(null, { status: 406 });

      const items = listItems
        .findMany((q) => q.where({ list_id: list.id }))
        .sort((a, b) => a.sort_order - b.sort_order);

      return HttpResponse.json({ ...list, list_items: items });
    }

    // All accessible lists — used by the home page
    const ownedLists = lists.findMany((q) => q.where({ user_id: user.id, state: "active" }));

    const memberships = listMembers.findMany((q) => q.where({ user_id: user.id }));
    const memberListIds = new Set(memberships.map((m) => m.list_id));
    const sharedLists = lists
      .findMany((q) => q.where({ state: "active" }))
      .filter((l) => memberListIds.has(l.id) && l.user_id !== user.id);

    return HttpResponse.json([...ownedLists, ...sharedLists]);
  }),

  // Lists — POST for home action (create new list)
  http.post("*/rest/v1/lists", async ({ request }) => {
    await delay();
    const body = (await request.json()) as {
      name: string;
      slug: string;
      user_id: string;
    };

    // Sentinel for e2e error testing — trigger a DB error without shared state
    if (body.name === "__fail__") {
      return HttpResponse.json(
        { code: "PGRST000", message: "Simulated DB error" },
        { status: 500 },
      );
    }

    const list = await lists.create({
      id: crypto.randomUUID(),
      name: body.name,
      slug: body.slug,
      state: "active",
      user_id: body.user_id,
      created_at: new Date().toISOString(),
    });
    return HttpResponse.json(list, { status: 201 });
  }),

  // Lists — PATCH for delete action (soft-delete by slug, scoped to requesting user)
  http.patch("*/rest/v1/lists", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const body = (await request.json()) as { state?: string };
    const slugParam = url.searchParams.get("slug")?.replace("eq.", "");
    const email = emailFromRequest(request);
    const user = email ? users.findFirst((q) => q.where({ email })) : null;
    if (slugParam && body.state && user) {
      const state = body.state as "active" | "deleted";
      const list = lists.findFirst((q) => q.where({ slug: slugParam, user_id: user.id }));
      if (list) {
        await lists.update((q) => q.where({ id: list.id }), {
          data(draft) {
            draft.state = state;
          },
        });
      }
    }
    return HttpResponse.json([]);
  }),

  // List items — GET for list action cleanup query
  http.get("*/rest/v1/list_items", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const listId = url.searchParams.get("list_id")?.replace("eq.", "");
    const state = url.searchParams.get("state")?.replace("eq.", "") as
      | "active"
      | "deleted"
      | undefined;

    let items = listId
      ? listItems.findMany((q) => q.where({ list_id: listId }))
      : listItems.findMany();

    if (state) {
      items = items.filter((item) => item.state === state);
    }

    // Sort by updated_at desc if requested
    const order = url.searchParams.get("order") ?? "";
    if (order.includes("updated_at.desc")) {
      items = [...items].sort((a, b) => b.updated_at - a.updated_at);
    }

    return HttpResponse.json(items.map((item) => ({ id: item.id })));
  }),

  // List items — POST for list action (add new item)
  http.post("*/rest/v1/list_items", async ({ request }) => {
    await delay();
    const body = (await request.json()) as {
      id?: string;
      list_id: string;
      value: string;
      state?: "active" | "deleted";
      sort_order?: number;
      updated_at?: number;
    };
    const item = await listItems.create({
      id: body.id ?? crypto.randomUUID(),
      list_id: body.list_id,
      value: body.value,
      state: body.state ?? "active",
      sort_order: body.sort_order ?? 0,
      updated_at: body.updated_at ?? Date.now(),
    });
    return HttpResponse.json(item, { status: 201 });
  }),

  // List items — PATCH for list action (update value/state/sort_order)
  http.patch("*/rest/v1/list_items", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const body = (await request.json()) as {
      value?: string;
      state?: "active" | "deleted";
      sort_order?: number;
      updated_at?: number;
    };
    const idParam = url.searchParams.get("id")?.replace("eq.", "");
    if (idParam) {
      await listItems.update((q) => q.where({ id: idParam }), {
        data(draft) {
          if (body.value !== undefined) draft.value = body.value;
          if (body.state !== undefined) draft.state = body.state;
          if (body.sort_order !== undefined) draft.sort_order = body.sort_order;
          if (body.updated_at !== undefined) draft.updated_at = body.updated_at;
        },
      });
    }
    return HttpResponse.json([]);
  }),

  // List items — DELETE for list action (hard delete overflow items)
  http.delete("*/rest/v1/list_items", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const idsParam = url.searchParams.get("id") ?? "";
    const inMatch = idsParam.match(/^in\.\((.+)\)$/);
    if (inMatch) {
      const ids = inMatch[1].split(",");
      ids.forEach((id) => listItems.delete((q) => q.where({ id })));
    }
    return HttpResponse.json([]);
  }),

  // List members — GET
  http.get("*/rest/v1/list_members", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const listId = url.searchParams.get("list_id")?.replace("eq.", "") ?? "";
    const members = listMembers.findMany((q) => q.where({ list_id: listId }));
    return HttpResponse.json(members);
  }),

  // List members — POST for config action (add collaborator)
  http.post("*/rest/v1/list_members", async ({ request }) => {
    await delay();
    const body = (await request.json()) as
      | { list_id: string; user_id: string }
      | Array<{ list_id: string; user_id: string }>;
    const members = Array.isArray(body) ? body : [body];
    for (const m of members) {
      await listMembers.create({
        id: crypto.randomUUID(),
        list_id: m.list_id,
        user_id: m.user_id,
      });
    }
    return HttpResponse.json([], { status: 201 });
  }),

  // List members — DELETE for config action (remove collaborator)
  http.delete("*/rest/v1/list_members", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const listId = url.searchParams.get("list_id")?.replace("eq.", "");
    const userIdParam = url.searchParams.get("user_id") ?? "";
    const inMatch = userIdParam.match(/^in\.\((.+)\)$/);
    if (listId && inMatch) {
      const userIds = inMatch[1].split(",");
      userIds.forEach((userId) =>
        listMembers.delete((q) => q.where({ list_id: listId, user_id: userId })),
      );
    }
    return HttpResponse.json([]);
  }),

  // Profiles — GET for config loader (all users except current)
  http.get("*/rest/v1/profiles", async ({ request }) => {
    await delay();
    const email = emailFromRequest(request);
    const user = email ? users.findFirst((q) => q.where({ email })) : null;
    if (!user) return HttpResponse.json([], { status: 401 });

    const allUsers = users.findMany((q) => q.where({ id: (id) => id !== user.id }));
    return HttpResponse.json(allUsers.map((u) => ({ id: u.id, email: u.email })));
  }),

  // Realtime broadcast — Supabase httpSend expects 202 for success.
  // In mock mode, emit to SSE subscribers so dev cross-tab sync works.
  http.post("*/realtime/v1/api/broadcast", async ({ request }) => {
    await delay();
    const body = (await request.json()) as { messages?: BroadcastMessage[] };
    for (const message of body.messages ?? []) {
      broadcastEmitter.emit("message", message);
    }
    return HttpResponse.json({ message: "ok" }, { status: 202 });
  }),
];
