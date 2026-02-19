import { Form, useNavigation } from "react-router";
import type { Route } from "./+types/set-password";
import { Button } from "~/components/button/button";
import { useForm } from "@conform-to/react/future";
import { zSetPassword } from "./schemas";

export { loader, action } from "./set-password.server";

export default function SetPassword({ loaderData, actionData }: Route.ComponentProps) {
  const { state } = useNavigation();
  const { form, fields } = useForm(zSetPassword, {
    lastResult: actionData,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <>
      <h1>Set new password</h1>
      <Form method="POST" {...form.props}>
        <input type="hidden" autoComplete="username" value={loaderData.email} readOnly />
        {form.errors?.map((error, i) => <p key={i}>{error}</p>)}
        <label htmlFor={fields.password.id}>New password</label>
        <input
          type="password"
          name={fields.password.name}
          id={fields.password.id}
          required
          minLength={8}
          autoComplete="new-password"
        />
        {fields.password.errors?.map((error, i) => <p key={i}>{error}</p>)}
        <label htmlFor={fields["confirm-password"].id}>Confirm password</label>
        <input
          type="password"
          name={fields["confirm-password"].name}
          id={fields["confirm-password"].id}
          required
          minLength={8}
          autoComplete="new-password"
        />
        {fields["confirm-password"].errors?.map((error, i) => <p key={i}>{error}</p>)}
        <Button type="submit" isSubmitting={state === "submitting"}>
          Update password
        </Button>
      </Form>
    </>
  );
}
