import { randomUUID } from "node:crypto";
import { users, lists, listItems, listMembers, waitlist } from "./db";

async function createListWithItems(
  ownerId: string,
  name: string,
  slug: string,
  items: string[],
) {
  const list = await lists.create({
    id: randomUUID(),
    name,
    slug,
    state: "active",
    user_id: ownerId,
    created_at: new Date().toISOString(),
  });

  for (let i = 0; i < items.length; i++) {
    await listItems.create({
      id: randomUUID(),
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
  waitlistEmail = "pending@test.com",
) {
  const owner = await users.create({ id: randomUUID(), email: ownerEmail });
  const collab = await users.create({ id: randomUUID(), email: collabEmail });

  // Owner gets 2 lists: one with 3 items, one empty
  const ownerList = await createListWithItems(owner.id, "Shopping", "shopping", [
    "Milk",
    "Bread",
    "Eggs",
  ]);
  await createListWithItems(owner.id, "Owner Empty", "owner-empty", []);

  // Collab gets 2 lists: one with 3 items, one empty
  await createListWithItems(collab.id, "Collab Shopping", "collab-shopping", [
    "Coffee",
    "Tea",
    "Sugar",
  ]);
  await createListWithItems(collab.id, "Collab Empty", "collab-empty", []);

  // Collab is also a member of the owner's Shopping list
  await listMembers.create({
    id: randomUUID(),
    list_id: ownerList.id,
    user_id: collab.id,
  });

  // One pending waitlist entry
  await waitlist.create({
    id: randomUUID(),
    email: waitlistEmail,
    first_name: "Pending",
    last_name: "User",
    created_at: new Date().toISOString(),
  });
}
