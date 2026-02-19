import { Form, Link, href, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { Button } from "~/components/button/button";
import { useForm } from "@conform-to/react/future";
import { zLogin } from "./schemas";
import { AuthField } from "./auth-field";
import * as styles from "./auth-field.css";

export { action } from "./login.server";

export default function Login({ actionData }: Route.ComponentProps) {
  const { state } = useNavigation();
  const { form, fields } = useForm(zLogin, {
    lastResult: actionData,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <>
      <h1>Sign in</h1>
      <Form method="POST" {...form.props} className={styles.form}>
        {form.errors?.map((error, i) => (
          <p key={i}>{error}</p>
        ))}
        <AuthField
          label="Email"
          type="email"
          id={fields.email.id}
          name={fields.email.name}
          autoComplete="email"
          required
          errors={fields.email.errors}
        />
        <AuthField
          label="Password"
          type="password"
          id={fields.password.id}
          name={fields.password.name}
          autoComplete="current-password"
          required
          errors={fields.password.errors}
        />
        <Button type="submit" isSubmitting={state === "submitting"}>
          Sign in
        </Button>
      </Form>
      <Link to={href("/forgot-password")}>Forgot password?</Link>
    </>
  );
}
