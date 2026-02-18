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

  // Fetch current members
  const { data: memberRows } = await supabase
    .from("list_members")
    .select("user_id")
    .eq("list_id", data.id);

  const memberUserIds = memberRows?.map((m) => m.user_id) ?? [];

  const members: { email: string }[] =
    memberUserIds.length > 0
      ? (
          await supabase
            .from("profiles")
            .select("email")
            .in("id", memberUserIds)
        ).data ?? []
      : [];

  return { listName: data.name, listId: data.id, isOwner, members };
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
  const email = (formData.get("member-email") as string | null)
    ?.trim()
    .toLowerCase();

  if (!email) {
    return { error: "Email is required" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (!profile) {
    return { error: "No user found with that email" };
  }

  if (profile.id === listData.user_id) {
    return { error: "You are already the owner of this list" };
  }

  const { error: insertError } = await supabase
    .from("list_members")
    .insert({ list_id: listData.id, user_id: profile.id });

  if (insertError) {
    const message =
      insertError.code === "23505"
        ? "This user is already a collaborator"
        : insertError.message;
    return { error: message };
  }

  return { error: null };
}
