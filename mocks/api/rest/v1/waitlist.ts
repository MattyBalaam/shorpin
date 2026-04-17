import { delay, HttpResponse, http } from "msw";
import { waitlist } from "../../../db.ts";

export const handlers = [
  http.head("*/rest/v1/waitlist", async () => {
    await delay();
    const count = waitlist.count();
    return new HttpResponse(null, {
      headers: { "Content-Range": `0-0/${count}` },
    });
  }),

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
