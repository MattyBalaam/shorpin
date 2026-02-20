import { Collection } from "@msw/data";
import * as v from "valibot";

export const users = new Collection({
  schema: v.object({
    id: v.string(),
    email: v.string(),
  }),
});

export const lists = new Collection({
  schema: v.object({
    id: v.string(),
    name: v.string(),
    slug: v.string(),
    state: v.string(),
    user_id: v.string(),
    created_at: v.string(),
  }),
});

export const listMembers = new Collection({
  schema: v.object({
    id: v.string(),
    list_id: v.string(),
    user_id: v.string(),
  }),
});

export const listItems = new Collection({
  schema: v.object({
    id: v.string(),
    list_id: v.string(),
    value: v.string(),
    state: v.picklist(["active", "deleted"]),
    sort_order: v.number(),
    updated_at: v.number(),
    updated_by: v.optional(v.string()),
    created_at: v.optional(v.string()),
  }),
});

export const waitlist = new Collection({
  schema: v.object({
    id: v.string(),
    email: v.string(),
  }),
});
