import { delay, HttpResponse, http } from "msw";
import { listMembers } from "../../../db.ts";

export const handlers = [
  http.get("*/rest/v1/list_members", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const listId = url.searchParams.get("list_id")?.replace("eq.", "") ?? "";
    const members = listMembers.findMany((q) => q.where({ list_id: listId }));
    return HttpResponse.json(members);
  }),

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
];
