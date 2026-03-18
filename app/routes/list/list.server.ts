import { parseSubmission, report } from "@conform-to/react/future";

import { dataWithError } from "remix-toast";
import * as v from "valibot";
import { supabaseContext } from "~/lib/supabase.middleware";
import { requireUser } from "~/lib/supabase.server";
import type { Route } from "./+types/list";
import { type Items, sortData, zItems, zList } from "./data";
import {
	isAddItemIntent,
	parseDeleteItemIntent,
	parseUndeleteItemIntent,
} from "./intents";

export async function loader({
	request,
	params: { list },
	context,
}: Route.LoaderArgs) {
	const supabase = context.get(supabaseContext);
	const user = await requireUser(supabase);

	const { data, error } = await supabase
		.from("lists")
		.select("id, name, slug, theme_primary, theme_secondary, list_items(*)")
		.eq("slug", list)
		.eq("state", "active")
		.order("sort_order", { referencedTable: "list_items", ascending: true })
		.single();

	if (error || !data) {
		if (error) console.error("Error loading list:", error);

		// Network/connectivity errors (e.g. Supabase unreachable) should not
		// masquerade as 404s — throw 503 so the client can distinguish them.
		if (error && !error.code && error.message?.includes("fetch")) {
			throw new Response("Service unavailable", { status: 503 });
		}

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

	const { data: listView, error: listViewError } = await supabase
		.from("list_views")
		.select("viewed_at")
		.eq("list_id", data.id)
		.eq("user_id", user.id)
		.order("viewed_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (listViewError) {
		console.error("Error loading list view:", listViewError);
		throw listViewError;
	}

	const lastViewedAt = listView?.viewed_at ?? 0;

	const referer = request.headers.get("referer");
	const isSameListRevalidation = (() => {
		if (!referer) {
			return false;
		}

		try {
			return new URL(referer).pathname === `/lists/${list}`;
		} catch {
			return false;
		}
	})();

	// Record that this user viewed the list on entry, but avoid writing on same-page
	// revalidation after actions (e.g. adding an item), which would clear unread too soon.
	if (!isSameListRevalidation) {
		const viewedAt = Date.now();
		const { error: viewError } = listView
			? await supabase
					.from("list_views")
					.update({ viewed_at: viewedAt })
					.eq("list_id", data.id)
					.eq("user_id", user.id)
			: await supabase
					.from("list_views")
					.insert({ list_id: data.id, user_id: user.id, viewed_at: viewedAt });

		if (viewError) {
			console.error("Error recording list view:", viewError);
			throw viewError;
		}
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
		newItemIds: items
			.filter(
				({ state, updatedAt }) =>
					state === "active" && updatedAt > lastViewedAt,
			)
			.map(({ id }) => id),
		lastDeleted: items.filter(({ state }) => state === "deleted").at(-1),
	};
}

export async function action({
	request,
	params: { list },
	context,
}: Route.ActionArgs) {
	const updatedAt = Date.now();

	const formData = await request.formData();

	const submission = parseSubmission(formData);

	const result = v.safeParse(zList, submission.payload);

	if (!result.success) {
		return {
			result: report(submission, {
				error: {
					issues: result.issues,
				},
			}),
		};
	}

	const supabase = context.get(supabaseContext);

	const toDelete = parseDeleteItemIntent(submission.intent);
	const toUndelete = parseUndeleteItemIntent(submission.intent);

	// Fetch current list and items from Supabase
	const { data, error: listError } = await supabase
		.from("lists")
		.select("id, name, slug, list_items(*)")
		.eq("slug", list)
		.eq("state", "active")
		.single();

	if (listError || !data) {
		if (listError) console.error("Error fetching list for action:", listError);
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

	const toAdd = isAddItemIntent(result.output["new-submit"]);

	// Handle new item
	if (result.output.new && toAdd) {
		const newId = crypto.randomUUID();
		const newSortOrder = getNextSortOrder();
		const { error: insertError } = await supabase.from("list_items").insert({
			id: newId,
			list_id: listId,
			value: result.output.new,
			state: "active",
			updated_at: updatedAt,
			sort_order: newSortOrder,
		});

		if (insertError) {
			console.error("Error inserting new item:", insertError);
		} else {
			existingMap[newId] = {
				id: newId,
				value: result.output.new,
				updatedAt,
				state: "active",
				sortOrder: newSortOrder,
			};
		}
	}

	// Handle updates to existing items and sort order changes
	const itemsToUpdate = result.output.items
		.map(({ id, value }, index) => ({ id, value, index }))
		.filter(({ id, value, index }) => {
			if (!existingMap[id]) return false;
			return (
				existingMap[id].value !== value || existingMap[id].sortOrder !== index
			);
		});

	if (itemsToUpdate.length > 0) {
		const { error: updateError } = await supabase.from("list_items").upsert(
			itemsToUpdate.map(({ id, value, index }) => ({
				id,
				list_id: listId,
				value,
				sort_order: index,
				updated_at: updatedAt,
				state: existingMap[id].state,
			})),
		);

		if (updateError) {
			console.error("Error updating items:", updateError);
		} else {
			for (const { id, value, index } of itemsToUpdate) {
				existingMap[id].value = value;
				existingMap[id].updatedAt = updatedAt;
				existingMap[id].sortOrder = index;
			}
		}
	}

	// Handle undelete - put item at bottom of list
	if (toUndelete && existingMap[toUndelete]) {
		const undeleteSortOrder = getNextSortOrder();
		const { error: undeleteError } = await supabase
			.from("list_items")
			.update({
				state: "active",
				updated_at: updatedAt,
				sort_order: undeleteSortOrder,
			})
			.eq("id", toUndelete);

		if (undeleteError) {
			console.error("Error restoring item:", undeleteError);
		} else {
			existingMap[toUndelete].state = "active";
			existingMap[toUndelete].updatedAt = updatedAt;
			existingMap[toUndelete].sortOrder = undeleteSortOrder;
		}
	}

	// Handle delete
	if (toDelete && existingMap[toDelete]) {
		const { error: deleteError } = await supabase
			.from("list_items")
			.update({ state: "deleted", updated_at: updatedAt })
			.eq("id", toDelete);

		if (deleteError) {
			console.error("Error deleting item:", deleteError);
		} else {
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
				const idsToRemove = deletedItems
					.slice(maxDeletedItems)
					.map((i) => i.id);
				const { error: purgeError } = await supabase
					.from("list_items")
					.delete()
					.in("id", idsToRemove);

				if (purgeError) {
					console.error("Error purging old deleted items:", purgeError);
				} else {
					for (const id of idsToRemove) {
						delete existingMap[id];
					}
				}
			}
		}
	}

	// Update theme colors if provided
	if (result.output.themePrimary && result.output.themeSecondary) {
		const { error: themeError } = await supabase
			.from("lists")
			.update({
				theme_primary: result.output.themePrimary,
				theme_secondary: result.output.themeSecondary,
			})
			.eq("id", listId);

		if (themeError) {
			console.error("Error updating theme:", themeError);
		}
	}

	const allItems = v.parse(zItems, Object.values(existingMap));

	// Broadcast change to other clients (fire-and-forget)
	const clientId = formData.get("clientId");
	const channel = supabase.channel(`list-${listId}`);
	void channel
		.httpSend("changed", { clientId })
		.finally(() => supabase.removeChannel(channel));

	return {
		lastDeleted: sortData(
			allItems.filter(({ state }) => state === "deleted"),
		).at(-1),
		lastResult: report(submission, {
			reset: toAdd && Boolean(result.output.new),
			value: {
				...result.output,
				new: toAdd ? "" : (result.output.new ?? ""),
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
