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
});

// ── Collections ───────────────────────────────────────────────────────────────

export const users = new Collection({ schema: usersSchema });
export const lists = new Collection({ schema: listsSchema });
export const listMembers = new Collection({ schema: listMembersSchema });
export const listItems = new Collection({ schema: listItemsSchema });
export const waitlist = new Collection({ schema: waitlistSchema });

// ── Contract checks ───────────────────────────────────────────────────────────
// These run during `pnpm typecheck`. A type error here means a mock schema field
// has diverged from the real Supabase Row type in database.types.ts.
// The error message names the exact field that is incompatible.

declare const _usersRow: InferOutput<typeof usersSchema>;
_usersRow satisfies Partial<Tables<"profiles">>;

declare const _listsRow: InferOutput<typeof listsSchema>;
_listsRow satisfies Partial<Tables<"lists">>;

declare const _listMembersRow: InferOutput<typeof listMembersSchema>;
_listMembersRow satisfies Partial<Tables<"list_members">>;

declare const _listItemsRow: InferOutput<typeof listItemsSchema>;
_listItemsRow satisfies Partial<Tables<"list_items">>;

declare const _waitlistRow: InferOutput<typeof waitlistSchema>;
_waitlistRow satisfies Partial<Tables<"waitlist">>;
