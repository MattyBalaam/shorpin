import { redirect, href } from "react-router";
import type { Route } from "./+types/login";
import { supabaseContext } from "~/lib/supabase.middleware";
import { parseSubmission, report } from "@conform-to/react/future";
import { zLogin } from "./schemas";

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const submission = parseSubmission(formData);
  const result = zLogin.safeParse(submission.payload);

  if (!result.success) {
    return report(submission);
  }

  const { email, password } = result.data;
  const supabase = context.get(supabaseContext);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return report(submission, {
      error: { formErrors: [error.message] },
    });
  }

  throw redirect(href("/"));
}
