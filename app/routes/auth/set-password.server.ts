import type { Route } from "./+types/set-password";
import { redirectWithSuccess } from "remix-toast";
import { href } from "react-router";
import { supabaseContext } from "~/lib/supabase.middleware";
import { parseSubmission, report } from "@conform-to/react/future";
import { zSetPassword } from "./schemas";

export async function loader({ context }: Route.LoaderArgs) {
  const supabase = context.get(supabaseContext);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { email: user?.email ?? "" };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const submission = parseSubmission(formData);
  const result = zSetPassword.safeParse(submission.payload);

  if (!result.success) {
    return report(submission);
  }

  const { password } = result.data;
  const confirm = result.data["confirm-password"];

  if (password !== confirm) {
    return report(submission, {
      error: { fieldErrors: { "confirm-password": ["Passwords do not match"] } },
    });
  }

  const supabase = context.get(supabaseContext);
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return report(submission, {
      error: { formErrors: [error.message] },
    });
  }

  throw await redirectWithSuccess(href("/"), "Password updated successfully");
}
