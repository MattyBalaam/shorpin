import { delay, HttpResponse, http } from "msw";
import { lists, listItems, listMembers, users } from "../../../db.ts";

function emailFromRequest(request: Request): string | null {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  return token || null;
}

export const handlers = [
  http.get("*/rest/v1/lists", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const email = emailFromRequest(request);
    const user = email ? users.findFirst((q) => q.where({ email })) : null;
    if (!user) return HttpResponse.json([], { status: 401 });

    const slugParam = url.searchParams.get("slug");

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

    const ownedLists = lists.findMany((q) => q.where({ user_id: user.id, state: "active" }));
    const memberships = listMembers.findMany((q) => q.where({ user_id: user.id }));
    const memberListIds = new Set(memberships.map((m) => m.list_id));
    const sharedLists = lists
      .findMany((q) => q.where({ state: "active" }))
      .filter((l) => memberListIds.has(l.id) && l.user_id !== user.id);

    const allLists = [...ownedLists, ...sharedLists];
    const order = url.searchParams.get("order") ?? "";

    if (order.includes("sort_order.asc")) {
      allLists.sort((a, b) => a.sort_order - b.sort_order);
    } else if (order.includes("created_at.desc")) {
      allLists.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    const selectParam = url.searchParams.get("select") ?? "";
    if (!selectParam.includes("list_items")) {
      return HttpResponse.json(allLists);
    }

    return HttpResponse.json(
      allLists.map((l) => ({
        ...l,
        list_items: listItems
          .findMany((q) => q.where({ list_id: l.id }))
          .map((item) => ({ updated_at: item.updated_at, state: item.state })),
      })),
    );
  }),

  http.post("*/rest/v1/lists", async ({ request }) => {
    await delay();
    const body = (await request.json()) as {
      name: string;
      slug: string;
      user_id: string;
      sort_order?: number;
    };

    if (body.name === "__fail__") {
      return HttpResponse.json(
        { code: "PGRST000", message: "Simulated DB error" },
        { status: 500 },
      );
    }

    const now = Date.now();
    const list = await lists.create({
      id: crypto.randomUUID(),
      name: body.name,
      slug: body.slug,
      sort_order:
        body.sort_order ??
        (() => {
          const existing = lists.findMany((q) =>
            q.where({ user_id: body.user_id, state: "active" }),
          );
          return Math.max(-1, ...existing.map((item) => item.sort_order)) + 1;
        })(),
      state: "active",
      user_id: body.user_id,
      created_at: new Date(now).toISOString(),
      updated_at: now,
    });
    return HttpResponse.json(list, { status: 201 });
  }),

  http.patch("*/rest/v1/lists", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const body = (await request.json()) as {
      state?: string;
      sort_order?: number;
      updated_at?: number;
    };
    const idParam = url.searchParams.get("id")?.replace("eq.", "");
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

    if (idParam && user) {
      const list = lists.findFirst((q) =>
        q.where({ id: idParam, user_id: user.id, state: "active" }),
      );
      if (list) {
        await lists.update((q) => q.where({ id: list.id }), {
          data(draft) {
            if (body.sort_order !== undefined) {
              draft.sort_order = body.sort_order;
            }
          },
        });
      }
    }

    return HttpResponse.json([]);
  }),
];
