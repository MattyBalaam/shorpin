import { delay, HttpResponse, http } from "msw";
import { lists, listItems, listMembers, listViews, users } from "../../../db.ts";

function emailFromRequest(request: Request): string | null {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  return token || null;
}

function hasListAccess(userId: string, listId: string) {
  const owned = lists.findFirst((q) => q.where({ id: listId, user_id: userId }));
  if (owned) return true;
  const membership = listMembers.findFirst((q) => q.where({ list_id: listId, user_id: userId }));
  return Boolean(membership);
}

const ADD_ITEM_INTENT = "add-item";
const DELETE_PREFIX = "delete-item-";
const UNDELETE_PREFIX = "undelete-item-";

export const handlers = [
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

    const order = url.searchParams.get("order") ?? "";
    if (order.includes("updated_at.desc")) {
      items = [...items].sort((a, b) => b.updated_at - a.updated_at);
    }

    return HttpResponse.json(items.map((item) => ({ id: item.id })));
  }),

  http.post("*/rest/v1/rpc/mutate_list", async ({ request }) => {
    await delay();
    const email = emailFromRequest(request);
    const user = email ? users.findFirst((q) => q.where({ email })) : null;
    if (!user) return HttpResponse.json([], { status: 401 });

    const body = (await request.json()) as {
      p_list_slug: string;
      p_payload: {
        new?: string;
        "new-submit"?: string;
        items?: Array<{ id: string; value: string }>;
        themePrimary?: string;
        themeSecondary?: string;
      };
      p_intent?: string | null;
      p_mutated_at: number;
    };

    const list =
      lists
        .findMany((q) => q.where({ slug: body.p_list_slug, state: "active" }))
        .find((candidate) => hasListAccess(user.id, candidate.id)) ?? null;

    if (!list) {
      return HttpResponse.json({ ok: false, reason: "not_found" });
    }

    let hasItemMutation = false;
    const updatedAt = body.p_mutated_at;
    const itemsPayload = body.p_payload.items ?? [];
    const getNextSortOrder = () => {
      const existing = listItems.findMany((q) => q.where({ list_id: list.id }));
      const maxOrder = Math.max(0, ...existing.map((item) => item.sort_order));
      return maxOrder + 1;
    };

    if (body.p_payload["new-submit"] === ADD_ITEM_INTENT && body.p_payload.new) {
      await listItems.create({
        id: crypto.randomUUID(),
        list_id: list.id,
        value: body.p_payload.new,
        state: "active",
        sort_order: getNextSortOrder(),
        updated_at: updatedAt,
      });
      hasItemMutation = true;
    }

    for (const [index, item] of itemsPayload.entries()) {
      const existing = listItems.findFirst((q) => q.where({ id: item.id, list_id: list.id }));
      if (!existing) continue;
      if (existing.value === item.value && existing.sort_order === index) continue;

      await listItems.update((q) => q.where({ id: item.id }), {
        data(draft) {
          draft.value = item.value;
          draft.sort_order = index;
          draft.updated_at = updatedAt;
        },
      });
      hasItemMutation = true;
    }

    const intent = body.p_intent ?? "";

    if (intent.startsWith(UNDELETE_PREFIX)) {
      const undeleteId = intent.slice(UNDELETE_PREFIX.length);
      const existing = listItems.findFirst((q) => q.where({ id: undeleteId, list_id: list.id }));
      if (existing) {
        await listItems.update((q) => q.where({ id: undeleteId }), {
          data(draft) {
            draft.state = "active";
            draft.sort_order = getNextSortOrder();
            draft.updated_at = updatedAt;
          },
        });
        hasItemMutation = true;
      }
    }

    if (intent.startsWith(DELETE_PREFIX)) {
      const deleteId = intent.slice(DELETE_PREFIX.length);
      const existing = listItems.findFirst((q) => q.where({ id: deleteId, list_id: list.id }));
      if (existing) {
        await listItems.update((q) => q.where({ id: deleteId }), {
          data(draft) {
            draft.state = "deleted";
            draft.updated_at = updatedAt;
          },
        });
        hasItemMutation = true;

        const deletedItems = listItems
          .findMany((q) => q.where({ list_id: list.id, state: "deleted" }))
          .sort((a, b) => b.updated_at - a.updated_at);

        if (deletedItems.length > 10) {
          for (const staleItem of deletedItems.slice(10)) {
            listItems.delete((q) => q.where({ id: staleItem.id }));
          }
        }
      }
    }

    if (body.p_payload.themePrimary && body.p_payload.themeSecondary) {
      await lists.update((q) => q.where({ id: list.id }), {
        data(draft) {
          draft.theme_primary = body.p_payload.themePrimary;
          draft.theme_secondary = body.p_payload.themeSecondary;
        },
      });
    }

    if (hasItemMutation) {
      await lists.update((q) => q.where({ id: list.id }), {
        data(draft) {
          draft.updated_at = updatedAt;
        },
      });
    }

    if (hasItemMutation) {
      const existingView = listViews.findFirst((q) =>
        q.where({ list_id: list.id, user_id: user.id }),
      );
      if (existingView) {
        await listViews.update((q) => q.where({ id: existingView.id }), {
          data(draft) {
            draft.viewed_at = updatedAt;
          },
        });
      } else {
        await listViews.create({
          id: crypto.randomUUID(),
          list_id: list.id,
          user_id: user.id,
          viewed_at: updatedAt,
        });
      }
    }

    const nextItems = listItems.findMany((q) => q.where({ list_id: list.id }));

    return HttpResponse.json({
      ok: true,
      listId: list.id,
      hasItemMutation,
      items: nextItems.map((item) => ({
        id: item.id,
        value: item.value,
        state: item.state,
        updatedAt: item.updated_at,
        sortOrder: item.sort_order,
      })),
    });
  }),

  http.post("*/rest/v1/list_items", async ({ request }) => {
    await delay();
    const isUpsert = (request.headers.get("Prefer") ?? "").includes("resolution=merge-duplicates");
    const rawBody = await request.json();

    if (isUpsert) {
      const items = (Array.isArray(rawBody) ? rawBody : [rawBody]) as Array<{
        id: string;
        list_id: string;
        value: string;
        state: "active" | "deleted";
        sort_order: number;
        updated_at: number;
      }>;
      let listId: string | null = null;
      for (const body of items) {
        const existing = listItems.findFirst((q) => q.where({ id: body.id }));
        if (existing) {
          await listItems.update((q) => q.where({ id: body.id }), {
            data(draft) {
              draft.value = body.value;
              draft.state = body.state;
              draft.sort_order = body.sort_order;
              draft.updated_at = body.updated_at;
            },
          });
          listId = existing.list_id;
        } else {
          await listItems.create(body);
          listId = body.list_id;
        }
      }
      if (listId) {
        const now = Date.now();
        await lists.update((q) => q.where({ id: listId }), {
          data(draft) {
            draft.updated_at = now;
          },
        });
      }
      return HttpResponse.json([]);
    }

    const body = rawBody as {
      id?: string;
      list_id: string;
      value: string;
      state?: "active" | "deleted";
      sort_order?: number;
      updated_at?: number;
    };
    const now = body.updated_at ?? Date.now();
    const item = await listItems.create({
      id: body.id ?? crypto.randomUUID(),
      list_id: body.list_id,
      value: body.value,
      state: body.state ?? "active",
      sort_order: body.sort_order ?? 0,
      updated_at: now,
    });
    await lists.update((q) => q.where({ id: body.list_id }), {
      data(draft) {
        draft.updated_at = now;
      },
    });
    return HttpResponse.json(item, { status: 201 });
  }),

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
      const now = body.updated_at ?? Date.now();
      await listItems.update((q) => q.where({ id: idParam }), {
        data(draft) {
          if (body.value !== undefined) draft.value = body.value;
          if (body.state !== undefined) draft.state = body.state;
          if (body.sort_order !== undefined) draft.sort_order = body.sort_order;
          if (body.updated_at !== undefined) draft.updated_at = now;
        },
      });
      const item = await listItems.findFirst((q) => q.where({ id: idParam }));
      if (item) {
        await lists.update((q) => q.where({ id: item.list_id }), {
          data(draft) {
            draft.updated_at = now;
          },
        });
      }
    }
    return HttpResponse.json([]);
  }),

  http.delete("*/rest/v1/list_items", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const idsParam = url.searchParams.get("id") ?? "";
    const inMatch = idsParam.match(/^in\.\((.+)\)$/);
    if (inMatch) {
      const ids = inMatch[1].split(",");
      const listIds = new Set<string>();
      for (const id of ids) {
        const item = listItems.findFirst((q) => q.where({ id }));
        if (item) {
          listIds.add(item.list_id);
        }
        listItems.delete((q) => q.where({ id }));
      }
      const now = Date.now();
      for (const listId of listIds) {
        await lists.update((q) => q.where({ id: listId }), {
          data(draft) {
            draft.updated_at = now;
          },
        });
      }
    }
    return HttpResponse.json([]);
  }),
];
