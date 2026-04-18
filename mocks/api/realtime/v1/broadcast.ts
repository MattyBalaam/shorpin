import { delay, HttpResponse, http } from "msw";
import { type BroadcastMessage, broadcastEmitter } from "../../../broadcast.ts";

export const broadcastHandlers = [
  http.post("*/realtime/v1/api/broadcast", async ({ request }) => {
    await delay();
    const body = (await request.json()) as { messages?: BroadcastMessage[] };
    for (const message of body.messages ?? []) {
      broadcastEmitter.emit("message", message);
    }
    return HttpResponse.json({ message: "ok" }, { status: 202 });
  }),
];
