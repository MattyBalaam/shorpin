import { delay, HttpResponse, http } from "msw";
import { users } from "../../../db.ts";

function emailFromRequest(request: Request): string | null {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  return token || null;
}

export const handlers = [
  http.get("*/rest/v1/profiles", async ({ request }) => {
    await delay();
    const email = emailFromRequest(request);
    const user = email ? users.findFirst((q) => q.where({ email })) : null;
    if (!user) return HttpResponse.json([], { status: 401 });

    const allUsers = users.findMany((q) => q.where({ id: (id) => id !== user.id }));
    return HttpResponse.json(allUsers.map((u) => ({ id: u.id, email: u.email })));
  }),
];
