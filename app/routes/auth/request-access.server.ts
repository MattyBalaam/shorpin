import type { Route } from "./+types/request-access";
import { supabaseContext } from "~/lib/supabase.middleware";
import { parseSubmission, report } from "@conform-to/react/future";
import { zRequestAccess } from "./schemas";

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const submission = parseSubmission(formData);
  const result = zRequestAccess.safeParse(submission.payload);

  if (!result.success) {
    return { result: report(submission), success: false };
  }

  const { email, first_name, last_name } = result.data;
  const supabase = context.get(supabaseContext);

  const { error } = await supabase
    .from("waitlist")
    .insert({ email, first_name, last_name });

  if (error) {
    return {
      result: report(submission, { error: { formErrors: ["Something went wrong. Please try again."] } }),
      success: false,
    };
  }

  return { result: report(submission), success: true };
}
