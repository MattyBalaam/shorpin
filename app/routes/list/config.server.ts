import type { Route } from "./+types/config";
import { createSupabaseClient } from "~/lib/supabase.server";

export async function loader({ params: { list }, request }: Route.LoaderArgs) {
  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("lists")
    .select("id, name, user_id")
    .eq("slug", list)
    .eq("state", "active")
    .single();

  if (error || !data) {
    throw new Response("List not found", { status: 404 });
  }

  const isOwner = data.user_id === user?.id;

  // All users except the owner
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, email")
    .neq("id", data.user_id ?? "");

  // Current member ids
  const { data: memberRows } = await supabase
    .from("list_members")
    .select("user_id")
    .eq("list_id", data.id);

  const memberIds = new Set(memberRows?.map((m) => m.user_id) ?? []);

  const users = (allProfiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    isMember: memberIds.has(p.id),
  }));

  return { listName: data.name, listId: data.id, isOwner, users };
}

export async function action({ params: { list }, request }: Route.ActionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: listData } = await supabase
    .from("lists")
    .select("id, user_id")
    .eq("slug", list)
    .eq("state", "active")
    .single();

  if (!listData || listData.user_id !== user?.id) {
    throw new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData();
  const submittedIds = new Set(formData.getAll("member-ids") as string[]);

  // Fetch current members
  const { data: currentRows } = await supabase
    .from("list_members")
    .select("user_id")
    .eq("list_id", listData.id);

  const currentIds = new Set(currentRows?.map((m) => m.user_id) ?? []);

  // Add newly checked users
  const toAdd = [...submittedIds].filter((id) => !currentIds.has(id));
  if (toAdd.length > 0) {
    await supabase.from("list_members").insert(
      toAdd.map((user_id) => ({ list_id: listData.id, user_id })),
    );
  }

  // Remove unchecked users
  const toRemove = [...currentIds].filter((id) => !submittedIds.has(id));
  if (toRemove.length > 0) {
    await supabase
      .from("list_members")
      .delete()
      .eq("list_id", listData.id)
      .in("user_id", toRemove);
  }

  return null;
}
