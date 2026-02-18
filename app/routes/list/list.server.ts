import type { Route } from "./+types/list";

import { dataWithError } from "remix-toast";

import { type Items, sortData, zItems, zList } from "./data";

import { parseSubmission, report } from "@conform-to/react/future";
import { createSupabaseClient } from "~/lib/supabase.server";

export async function loader({ params: { list }, request }: Route.LoaderArgs) {
  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  const { data, error } = await supabase
    .from("lists")
    .select("id, name, slug, theme_primary, theme_secondary, list_items(*)")
    .eq("slug", list)
    .eq("state", "active")
    .order("sort_order", { referencedTable: "list_items", ascending: true })
    .single();

  if (error || !data) {
    console.log("error", error);

    throw await dataWithError(
      {
        message: error
          ? error.code === "PGRST116"
            ? "List does not exist"
            : error.message
          : "unknown error",
      },
      "List does not exist",
      { status: 404 },
    );
  }

  const items = data.list_items.map((item) => ({
    id: item.id,
    value: item.value,
    state: item.state,
    updatedAt: item.updated_at,
    sortOrder: item.sort_order,
  })) satisfies Items;

  return {
    defaultValue: {
      name: data.name,
      items: items.filter(({ state }) => state === "active"),
      themePrimary: data.theme_primary ?? undefined,
      themeSecondary: data.theme_secondary ?? undefined,
    },
    listId: data.id,
    lastDeleted: items.filter(({ state }) => state === "deleted").at(-1),
  };
}

export async function action({ request, params: { list } }: Route.ActionArgs) {
  const updatedAt = Date.now();

  const formData = await request.formData();

  const submission = parseSubmission(formData);

  const result = zList.safeParse(submission.payload);

  if (!result.success) {
    return {
      result: report(submission, {
        error: {
          issues: result.error.issues,
        },
      }),
    };
  }

  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  const toDelete = submission.intent?.startsWith("delete-item-")
    ? submission.intent.replace("delete-item-", "")
    : undefined;

  const toUndelete = submission.intent?.startsWith("undelete-item-")
    ? submission.intent.replace("undelete-item-", "")
    : undefined;

  // Fetch current list and items from Supabase
  const { data, error: listError } = await supabase
    .from("lists")
    .select("id, name, slug, list_items(*)")
    .eq("slug", list)
    .eq("state", "active")
    .single();

  if (listError || !data) {
    return {
      result: report(submission, {
        error: {
          issues: [{ message: "List not found" }],
        },
      }),
    };
  }

  const listId = data.id;
  const existingItems = data.list_items;

  const existingMap = Object.fromEntries(
    existingItems.map((item) => [
      item.id,
      {
        id: item.id,
        value: item.value,
        state: item.state,
        updatedAt: item.updated_at,
        sortOrder: item.sort_order,
      },
    ]),
  );

  const getNextSortOrder = () => {
    const maxOrder = Math.max(
      0,
      ...Object.values(existingMap).map((i) => i.sortOrder),
    );
    return maxOrder + 1;
  };

  const newValue = formData.get("new");

  // Handle new item
  if (result.data.new) {
    const newId = crypto.randomUUID();
    const newSortOrder = getNextSortOrder();
    const { error: insertError } = await supabase.from("list_items").insert({
      id: newId,
      list_id: listId,
      value: result.data.new,
      state: "active",
      updated_at: updatedAt,
      sort_order: newSortOrder,
    });

    if (!insertError) {
      existingMap[newId] = {
        id: newId,
        value: result.data.new,
        updatedAt,
        state: "active",
        sortOrder: newSortOrder,
      };
    }
  }

  // Handle updates to existing items and sort order changes
  for (const [index, { id, value }] of result.data.items.entries()) {
    if (!existingMap[id]) continue;

    const valueChanged = existingMap[id].value !== value;
    const orderChanged = existingMap[id].sortOrder !== index;

    if (valueChanged || orderChanged) {
      await supabase
        .from("list_items")
        .update({
          ...(valueChanged && { value }),
          ...(orderChanged && { sort_order: index }),
          updated_at: updatedAt,
        })
        .eq("id", id);

      existingMap[id].value = value;
      existingMap[id].updatedAt = updatedAt;
      existingMap[id].sortOrder = index;
    }
  }

  // Handle undelete - put item at bottom of list
  if (toUndelete && existingMap[toUndelete]) {
    const undeleteSortOrder = getNextSortOrder();
    await supabase
      .from("list_items")
      .update({
        state: "active",
        updated_at: updatedAt,
        sort_order: undeleteSortOrder,
      })
      .eq("id", toUndelete);

    existingMap[toUndelete].state = "active";
    existingMap[toUndelete].updatedAt = updatedAt;
    existingMap[toUndelete].sortOrder = undeleteSortOrder;
  }

  // Handle delete
  if (toDelete && existingMap[toDelete]) {
    await supabase
      .from("list_items")
      .update({ state: "deleted", updated_at: updatedAt })
      .eq("id", toDelete);

    existingMap[toDelete].state = "deleted";
    existingMap[toDelete].updatedAt = updatedAt;

    // Keep only the 10 most recent deleted items, hard delete the rest
    const maxDeletedItems = 10;
    const { data: deletedItems } = await supabase
      .from("list_items")
      .select("id")
      .eq("list_id", listId)
      .eq("state", "deleted")
      .order("updated_at", { ascending: false });

    if (deletedItems && deletedItems.length > maxDeletedItems) {
      const idsToRemove = deletedItems.slice(maxDeletedItems).map((i) => i.id);
      await supabase.from("list_items").delete().in("id", idsToRemove);

      for (const id of idsToRemove) {
        delete existingMap[id];
      }
    }
  }

  // Update theme colors if provided
  if (result.data.themePrimary && result.data.themeSecondary) {
    await supabase
      .from("lists")
      .update({
        theme_primary: result.data.themePrimary,
        theme_secondary: result.data.themeSecondary,
      })
      .eq("id", listId);
  }

  const allItems = zItems.parse(Object.values(existingMap));

  // Broadcast change to other clients
  const clientId = formData.get("clientId");
  const channel = supabase.channel(`list-${listId}`);
  await channel.httpSend("changed", { clientId });
  supabase.removeChannel(channel);

  return {
    lastDeleted: sortData(
      allItems.filter(({ state }) => state === "deleted"),
    ).at(-1),
    lastResult: report(submission, {
      reset: Boolean(newValue),
      value: {
        ...result.data,
        new: Boolean(newValue) ? "" : (result.data.new ?? ""),
        items: sortData(allItems.filter(({ state }) => state === "active")).map(
          (item) => ({
            id: item.id,
            value: item.value,
          }),
        ),
      },
    }),
  };
}
