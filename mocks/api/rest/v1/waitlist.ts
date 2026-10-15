import { delay, HttpResponse, http } from "msw";
import { waitlist } from "../../../db.ts";
import { inSameScope } from "../../../scope.ts";

function emailFromRequest(request: Request): string {
  const auth = request.headers.get("Authorization") ?? "";
  return auth.replace("Bearer ", "");
}

function entriesFor(request: Request) {
  const requester = emailFromRequest(request);
  return waitlist.findMany((q) => q.where({ email: (e) => inSameScope(e, requester) }));
}

export const handlers = [
  http.head("*/rest/v1/waitlist", async ({ request }) => {
    await delay();
    const count = entriesFor(request).length;
    return new HttpResponse(null, {
      headers: { "Content-Range": `0-0/${count}` },
    });
  }),

  http.get("*/rest/v1/waitlist", async ({ request }) => {
    await delay();
    const entries = entriesFor(request);
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
];
