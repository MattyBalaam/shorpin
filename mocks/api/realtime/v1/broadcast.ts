import { delay, HttpResponse, http } from "msw";
import { broadcastEmitter } from "../../../broadcast.ts";

// @supabase/realtime-js ≥2.108 uses per-event URLs instead of the old batch endpoint.
// POST /realtime/v1/api/broadcast/:subTopic/events/:event with raw payload as body.
export const broadcastHandlers = [
  http.post("*/realtime/v1/api/broadcast/:subTopic/events/:event", async ({ request, params }) => {
    await delay();
    const { subTopic, event } = params as { subTopic: string; event: string };
    const payload = (await request.json()) as Record<string, unknown>;
    broadcastEmitter.emit("message", { topic: subTopic, event, payload });
    return HttpResponse.json({ message: "ok" }, { status: 202 });
  }),
];
