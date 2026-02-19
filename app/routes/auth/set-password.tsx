import { Form, useNavigation } from "react-router";
import type { Route } from "./+types/set-password";
import { Button } from "~/components/button/button";
import { useForm } from "@conform-to/react/future";
import { zSetPassword } from "./schemas";
import { AuthField } from "./auth-field";
import * as styles from "./auth-field.css";

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
      <Form method="POST" {...form.props} className={styles.form}>
        <input type="hidden" autoComplete="username" value={loaderData.email} readOnly />
        {form.errors?.map((error, i) => (
          <p key={i}>{error}</p>
        ))}
        <AuthField
          label="New password"
          type="password"
          id={fields.password.id}
          name={fields.password.name}
          autoComplete="new-password"
          required
          minLength={8}
          errors={fields.password.errors}
        />
        <AuthField
          label="Confirm password"
          type="password"
          id={fields["confirm-password"].id}
          name={fields["confirm-password"].name}
          autoComplete="new-password"
          required
          minLength={8}
          errors={fields["confirm-password"].errors}
        />
        <Button type="submit" isSubmitting={state === "submitting"}>
          Update password
        </Button>
      </Form>
    </>
  );
}
