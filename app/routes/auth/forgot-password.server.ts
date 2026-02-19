import type { Route } from "./+types/forgot-password";
import { supabaseContext } from "~/lib/supabase.middleware";
import { parseSubmission, report } from "@conform-to/react/future";
import * as v from "valibot";
import { zForgotPassword } from "./schemas";

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const submission = parseSubmission(formData);
  const result = v.safeParse(zForgotPassword, submission.payload);

  if (!result.success) {
    return { result: report(submission), success: false };
  }

  const supabase = context.get(supabaseContext);
  await supabase.auth.resetPasswordForEmail(result.output.email);

  // Always return success to avoid leaking whether an email exists
  return { result: report(submission), success: true };
}
