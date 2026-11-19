import { listItems, listMembers, lists, users, waitlist } from "./db.ts";
import { collabLists, ownerLists } from "./seed-data.ts";

async function createListWithItems(
  ownerId: string,
  name: string,
  slug: string,
  items: string[],
  sortOrder: number,
) {
  const now = Date.now();
  const list = await lists.create({
    id: crypto.randomUUID(),
    name,
    slug,
    sort_order: sortOrder,
    state: "active",
    user_id: ownerId,
    created_at: new Date(now).toISOString(),
    updated_at: now,
  });

  for (let i = 0; i < items.length; i++) {
    await listItems.create({
      id: crypto.randomUUID(),
      list_id: list.id,
      value: items[i],
      state: "active",
      sort_order: i,
      updated_at: Date.now(),
    });
  }

  return list;
}

export async function seed(
  ownerEmail = "owner@test.com",
  collabEmail = "collab@test.com",
  waitlistEmail?: string,
) {
  const owner = await users.create({
    id: crypto.randomUUID(),
    email: ownerEmail,
  });
  const collab = await users.create({
    id: crypto.randomUUID(),
    email: collabEmail,
  });

  // The lists are in seed-data.ts, shared with the preview users' seed.
  const ownerListIds: string[] = [];
  for (const [i, { name, slug, items }] of ownerLists.entries()) {
    ownerListIds.push((await createListWithItems(owner.id, name, slug, items, i)).id);
  }
  for (const [i, { name, slug, items }] of collabLists.entries()) {
    await createListWithItems(collab.id, name, slug, items, i);
  }

  // Collab is also a member of the owner's first list (Shopping)
  await listMembers.create({
    id: crypto.randomUUID(),
    list_id: ownerListIds[0] ?? "",
    user_id: collab.id,
  });

  // One pending waitlist entry — only created when a specific email is provided
  if (waitlistEmail) {
    await waitlist.create({
      id: crypto.randomUUID(),
      email: waitlistEmail,
      first_name: "Pending",
      last_name: "User",
      // Fixed, so the sign-ups snapshot's date (masked, but still sized by
      // its text) doesn't change width from day to day.
      created_at: "2026-01-15T12:00:00.000Z",
    });
  }
}
