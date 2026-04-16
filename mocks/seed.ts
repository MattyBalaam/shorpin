import { listItems, listMembers, lists, users, waitlist } from "./db.ts";

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

  // Owner gets 2 lists: one with 3 items, one empty
  const ownerList = await createListWithItems(
    owner.id,
    "Shopping",
    "shopping",
    ["Milk", "Bread", "Eggs"],
    0,
  );
  await createListWithItems(owner.id, "Owner Empty", "owner-empty", [], 1);

  // Collab gets 2 lists: one with 3 items, one empty
  await createListWithItems(
    collab.id,
    "Collab Shopping",
    "collab-shopping",
    ["Coffee", "Tea", "Sugar"],
    0,
  );
  await createListWithItems(collab.id, "Collab Empty", "collab-empty", [], 1);

  // Collab is also a member of the owner's Shopping list
  await listMembers.create({
    id: crypto.randomUUID(),
    list_id: ownerList.id,
    user_id: collab.id,
  });

  // One pending waitlist entry — only created when a specific email is provided
  if (waitlistEmail) {
    await waitlist.create({
      id: crypto.randomUUID(),
      email: waitlistEmail,
      first_name: "Pending",
      last_name: "User",
      created_at: new Date().toISOString(),
    });
  }
}
