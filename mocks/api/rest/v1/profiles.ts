import { HttpResponse, http } from "msw/http";
import { delay } from "msw/utils/delay";
import { users } from "../../../db.ts";
import { inSameScope } from "../../../scope.ts";

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

    // `.eq("id", self).maybeSingle()` — the root loader reading the user's
    // own app style. Real RLS would allow any profile; nothing needs that.
    const idFilter = new URL(request.url).searchParams.get("id");
    if (idFilter?.startsWith("eq.")) {
      const own = idFilter === `eq.${user.id}` ? [user] : [];
      return HttpResponse.json(
        own.map((u) => ({ id: u.id, email: u.email, app_style: u.app_style ?? null })),
      );
    }

    const allUsers = users.findMany((q) =>
      q.where({ id: (id) => id !== user.id, email: (e) => inSameScope(e, user.email) }),
    );
    return HttpResponse.json(allUsers.map((u) => ({ id: u.id, email: u.email })));
  }),

  // Mirrors "users can update own profile": a filter on anyone else's id
  // matches no rows.
  http.patch("*/rest/v1/profiles", async ({ request }) => {
    await delay();
    const email = emailFromRequest(request);
    const user = email ? users.findFirst((q) => q.where({ email })) : null;
    if (!user) return HttpResponse.json([], { status: 401 });

    const idFilter = new URL(request.url).searchParams.get("id");
    if (idFilter !== `eq.${user.id}`) return new HttpResponse(null, { status: 204 });

    const body = (await request.json()) as { app_style?: string | null };
    await users.update((q) => q.where({ id: user.id }), {
      data(draft) {
        draft.app_style = body.app_style ?? null;
      },
    });
    return new HttpResponse(null, { status: 204 });
  }),
];
