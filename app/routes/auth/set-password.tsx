import { Form, useNavigation } from "react-router";
import type { Route } from "./+types/set-password";
import { Button } from "~/components/button/button";

export { loader, action } from "./set-password.server";

export default function SetPassword({ loaderData, actionData }: Route.ComponentProps) {
  const { state } = useNavigation();

  return (
    <>
      <h1>Set new password</h1>
      <Form method="POST">
        <input type="hidden" autoComplete="username" value={loaderData.email} readOnly />
        <label>
          New password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            name="confirm-password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {actionData?.error && <p>{actionData.error}</p>}
        <Button type="submit" isSubmitting={state === "submitting"}>
          Update password
        </Button>
      </Form>
    </>
  );
}
