import { authHandlers } from "./api/auth/v1/index.ts";
import { broadcastHandlers } from "./api/realtime/v1/broadcast.ts";
import { handlers as listHandlers } from "./api/rest/v1/lists.ts";
import { handlers as listItemHandlers } from "./api/rest/v1/list_items.ts";
import { handlers as listMemberHandlers } from "./api/rest/v1/list_members.ts";
import { handlers as listViewHandlers } from "./api/rest/v1/list_views.ts";
import { handlers as profileHandlers } from "./api/rest/v1/profiles.ts";
import { handlers as waitlistHandlers } from "./api/rest/v1/waitlist.ts";

export const handlers = [
  ...authHandlers,
  ...broadcastHandlers,
  ...listHandlers,
  ...listItemHandlers,
  ...listMemberHandlers,
  ...listViewHandlers,
  ...profileHandlers,
  ...waitlistHandlers,
];
