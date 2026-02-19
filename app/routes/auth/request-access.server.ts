import { href } from "react-router";
import type { Route } from "./+types/request-access";
import { supabaseContext } from "~/lib/supabase.middleware";
import { parseSubmission, report } from "@conform-to/react/future";
import { redirectWithSuccess } from "remix-toast";
import { zRequestAccess } from "./schemas";

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const submission = parseSubmission(formData);
  const result = zRequestAccess.safeParse(submission.payload);

  if (!result.success) {
    return report(submission);
  }

  const { email, first_name, last_name } = result.data;
  const supabase = context.get(supabaseContext);

  const { error } = await supabase
    .from("waitlist")
    .insert({ email, first_name, last_name });

  if (error) {
    return report(submission, { error: { formErrors: ["Something went wrong. Please try again."] } });
  }

  return redirectWithSuccess(href("/login"), "Your account is being verified. We'll be in touch soon.");
}
