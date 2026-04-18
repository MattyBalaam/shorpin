import { delay, HttpResponse, http } from "msw";
import { listViews, users } from "../../../db.ts";

function emailFromRequest(request: Request): string | null {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  return token || null;
}

export const handlers = [
  http.head("*/rest/v1/list_views", async ({ request }) => {
    await delay();
    const email = emailFromRequest(request);
    const user = email ? users.findFirst((q) => q.where({ email })) : null;
    if (!user) return new HttpResponse(null, { status: 401 });
    const count = listViews.findMany((q) => q.where({ user_id: user.id })).length;
    return new HttpResponse(null, {
      status: 204,
      headers: { "Content-Range": `0-0/${count}` },
    });
  }),

  http.get("*/rest/v1/list_views", async ({ request }) => {
    await delay();
    const email = emailFromRequest(request);
    const user = email ? users.findFirst((q) => q.where({ email })) : null;
    if (!user) return HttpResponse.json([], { status: 401 });
    const views = listViews.findMany((q) => q.where({ user_id: user.id }));
    return HttpResponse.json(views.map((v) => ({ list_id: v.list_id, viewed_at: v.viewed_at })));
  }),

  http.patch("*/rest/v1/list_views", async ({ request }) => {
    await delay();
    const email = emailFromRequest(request);
    const user = email ? users.findFirst((q) => q.where({ email })) : null;
    if (!user) return HttpResponse.json([], { status: 401 });

    const url = new URL(request.url);
    const listId = url.searchParams.get("list_id")?.replace("eq.", "");
    const userId = url.searchParams.get("user_id")?.replace("eq.", "");
    const body = (await request.json()) as { viewed_at?: number };

    if (!listId || userId !== user.id || body.viewed_at === undefined) {
      return HttpResponse.json([]);
    }

    const viewedAt = body.viewed_at;
    const existing = listViews.findFirst((q) => q.where({ list_id: listId, user_id: user.id }));

    if (existing) {
      await listViews.update((q) => q.where({ id: existing.id }), {
        data(draft) {
          draft.viewed_at = viewedAt;
        },
      });
    }

    return HttpResponse.json([]);
  }),

  http.post("*/rest/v1/list_views", async ({ request }) => {
    await delay();
    const email = emailFromRequest(request);
    const user = email ? users.findFirst((q) => q.where({ email })) : null;
    if (!user) return HttpResponse.json([], { status: 401 });
    const body = (await request.json()) as {
      list_id: string;
      user_id: string;
      viewed_at: number;
    };
    const existing = listViews.findFirst((q) =>
      q.where({ list_id: body.list_id, user_id: user.id }),
    );
    if (existing) {
      await listViews.update((q) => q.where({ id: existing.id }), {
        data(draft) {
          draft.viewed_at = body.viewed_at;
        },
      });
    } else {
      await listViews.create({
        id: crypto.randomUUID(),
        list_id: body.list_id,
        user_id: body.user_id,
        viewed_at: body.viewed_at,
      });
    }
    return HttpResponse.json([]);
  }),
];
