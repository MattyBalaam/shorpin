import { redirectWithError, redirectWithSuccess } from "remix-toast";
import type { Route } from "./+types/config";
import { href } from "react-router";
import { supabaseContext } from "~/lib/supabase.middleware";

export async function loader({ params: { list }, context }: Route.LoaderArgs) {
  const supabase = context.get(supabaseContext);

  const [
    {
      data: { user },
    },
    { data, error },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("lists")
      .select("id, name, user_id")
      .eq("slug", list)
      .eq("state", "active")
      .single(),
  ]);

  if (error || !data) {
    if (error) console.error("Error loading list config:", error);
    throw redirectWithError(href("/"), "List not found.");
  }

  if (data.user_id !== user?.id) {
    throw redirectWithError(href("/"), "Only the list owner can manage settings.");
  }

  const users = Promise.all([
    supabase
      .from("profiles")
      .select("id, email")
      .neq("id", data.user_id ?? ""),
    supabase.from("list_members").select("user_id").eq("list_id", data.id),
  ]).then(([{ data: allProfiles }, { data: memberRows }]) => {
    const memberIds = new Set(memberRows?.map((m) => m.user_id) ?? []);
    return (allProfiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      isMember: memberIds.has(p.id),
    }));
  });

  return { listName: data.name, users };
}

export async function action({ params: { list }, request, context }: Route.ActionArgs) {
  const supabase = context.get(supabaseContext);

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
    throw redirectWithError(href("/"), "Only the list owner can manage settings.");
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
    const { error: addError } = await supabase
      .from("list_members")
      .insert(toAdd.map((user_id) => ({ list_id: listData.id, user_id })));

    if (addError) {
      console.error("Error adding list members:", addError);
      throw redirectWithError(href("/"), "Failed to update collaborators. Please try again.");
    }
  }

  // Remove unchecked users
  const toRemove = [...currentIds].filter((id) => !submittedIds.has(id));
  if (toRemove.length > 0) {
    const { error: removeError } = await supabase
      .from("list_members")
      .delete()
      .eq("list_id", listData.id)
      .in("user_id", toRemove);

    if (removeError) {
      console.error("Error removing list members:", removeError);
      throw redirectWithError(href("/"), "Failed to update collaborators. Please try again.");
    }
  }

  return redirectWithSuccess(href("/"), "changed collaborators");
}
