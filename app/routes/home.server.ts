import { parseSubmission, report } from "@conform-to/react/future";

import { href } from "react-router";
import { redirectWithSuccess } from "remix-toast";
import * as v from "valibot";

import { resolveSlug, slugify } from "~/lib/slugify";
import { supabaseContext } from "~/lib/supabase.middleware";
import { requireUser } from "~/lib/supabase.server";
import type { Route } from "./+types/home";
import { zCreate } from "./home.schema";

export async function loader({ context }: Route.LoaderArgs) {
	const supabase = context.get(supabaseContext);

	const user = await requireUser(supabase);
	const userId = user.id;

	const viewsPromise = supabase
		.from("list_views")
		.select("list_id, viewed_at")
		.eq("user_id", userId)
		.then(({ data, error }) => {
			if (error) {
				console.error("Error loading list views:", error);
				throw error;
			}

			return Object.fromEntries(
				(data ?? []).map((v) => [v.list_id, v.viewed_at]),
			);
		});

	return {
		userId,
		lists: supabase
			.from("lists")
			.select("id, name, slug, user_id, list_items(updated_at, state)")
			.eq("state", "active")
			.order("created_at", { ascending: false })
			.then(({ data, error }) => {
				if (error) {
					console.error("Error loading lists:", error);
					throw error;
				}
				return data ?? [];
			})
			.then((lists) =>
				viewsPromise.then((viewedAtMap) =>
					lists.map(({ list_items, ...list }) => {
						const activeItems = list_items.filter(
							(item) => item.state === "active",
						);
						return {
							...list,
							totalCount: activeItems.length,
							unreadCount: activeItems.filter(
								(item) => item.updated_at > (viewedAtMap[list.id] ?? 0),
							).length,
						};
					}),
				),
			),
		waitlistCount: supabase
			.from("waitlist")
			.select("*", { count: "exact", head: true })
			.then(({ count }) => count ?? 0),
	};
}

export async function action({ request, context }: Route.ActionArgs) {
	const formData = await request.formData();

	const submission = parseSubmission(formData);

	const result = v.safeParse(zCreate, submission.payload);

	if (!result.success) {
		return report(submission);
	}

	const listName = result.output["new-list"];
	const baseSlug = slugify(listName);

	const supabase = context.get(supabaseContext);

	const user = await requireUser(supabase);

	const { data: matches } = await supabase
		.from("lists")
		.select("slug")
		.like("slug", `${baseSlug}%`)
		.eq("state", "active");

	const slug = resolveSlug(
		baseSlug,
		matches?.map((m: { slug: string }) => m.slug) ?? [],
	);

	const { error } = await supabase.from("lists").insert({
		name: listName,
		slug,
		user_id: user.id,
	});

	if (error) {
		console.error("Error creating list:", error);
		return report(submission, {
			error: { formErrors: ["Failed to create list. Please try again."] },
		});
	}

	return redirectWithSuccess(
		href("/lists/:list", { list: slug }),
		`List "${listName}" created successfully!`,
	);
}
