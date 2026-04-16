import { href } from "react-router";
import { redirectWithSuccess } from "remix-toast";
import type { Route } from "./+types/logout";
import { supabaseContext } from "~/lib/supabase.middleware";

export async function action({ context }: Route.ActionArgs) {
	const supabase = context.get(supabaseContext);
	await supabase.auth.signOut();
	throw await redirectWithSuccess(href("/login"), "You have been logged out.");
}
