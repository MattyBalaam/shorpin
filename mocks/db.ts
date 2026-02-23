import { Collection } from "@msw/data";
import * as v from "valibot";
import type { InferOutput } from "valibot";
import type { Tables } from "~/lib/database.types";

// ── Schemas ───────────────────────────────────────────────────────────────────

const usersSchema = v.object({
  id: v.string(),
  email: v.string(),
});

const listsSchema = v.object({
  id: v.string(),
  name: v.string(),
  slug: v.string(),
  state: v.picklist(["active", "deleted"]),
  user_id: v.string(),
  created_at: v.string(),
});

const listMembersSchema = v.object({
  id: v.string(),
  list_id: v.string(),
  user_id: v.string(),
});

const listItemsSchema = v.object({
  id: v.string(),
  list_id: v.string(),
  value: v.string(),
  state: v.picklist(["active", "deleted"]),
  sort_order: v.number(),
  updated_at: v.number(),
  updated_by: v.optional(v.string()),
  created_at: v.optional(v.string()),
});

const waitlistSchema = v.object({
  id: v.string(),
  email: v.string(),
  first_name: v.optional(v.string()),
  last_name: v.optional(v.string()),
  created_at: v.optional(v.string()),
});

// ── Collections ───────────────────────────────────────────────────────────────

export const users = new Collection({ schema: usersSchema });
export const lists = new Collection({ schema: listsSchema });
export const listMembers = new Collection({ schema: listMembersSchema });
export const listItems = new Collection({ schema: listItemsSchema });
export const waitlist = new Collection({ schema: waitlistSchema });

// ── Contract checks ───────────────────────────────────────────────────────────
// Each field must be `true`. If a mock schema field diverges from the real
// Supabase Row type, TypeScript errors on that key during `pnpm typecheck`:
// "Type 'true' is not assignable to type 'false'".
// `void` makes this a valid expression statement with no unused-variable warning.
void ({
  users: true,
  lists: true,
  listMembers: true,
  listItems: true,
  waitlist: true,
} satisfies {
  users: InferOutput<typeof usersSchema> extends Partial<Tables<"profiles">> ? true : false;
  lists: InferOutput<typeof listsSchema> extends Partial<Tables<"lists">> ? true : false;
  listMembers: InferOutput<typeof listMembersSchema> extends Partial<Tables<"list_members">>
    ? true
    : false;
  listItems: InferOutput<typeof listItemsSchema> extends Partial<Tables<"list_items">>
    ? true
    : false;
  waitlist: InferOutput<typeof waitlistSchema> extends Partial<Tables<"waitlist">> ? true : false;
});
