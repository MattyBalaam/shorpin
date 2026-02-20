import { users, lists, listMembers } from "./db";

export async function seed() {
  await users.create({ id: "user-owner", email: "owner@test.com" });
  await users.create({ id: "user-collab", email: "collab@test.com" });

  await lists.create({
    id: "list-private",
    name: "My Private List",
    slug: "my-private-list",
    state: "active",
    user_id: "user-owner",
    created_at: new Date().toISOString(),
  });

  const sharedList = await lists.create({
    id: "list-shared",
    name: "Shared List",
    slug: "shared-list",
    state: "active",
    user_id: "user-owner",
    created_at: new Date().toISOString(),
  });

  await listMembers.create({
    id: "member-1",
    list_id: sharedList.id,
    user_id: "user-collab",
  });
}
