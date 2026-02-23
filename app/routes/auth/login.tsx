import { Form, href, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { Button } from "~/components/button/button";
import { useForm } from "@conform-to/react/future";
import { zLogin } from "./schemas";
import { AuthField } from "./auth-field";
import * as styles from "./auth-field.css";
import { Link } from "~/components/link/link";

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
        <AuthField meta={fields.email} label="Email" type="email" autoComplete="email" />
        <AuthField
          meta={fields.password}
          label="Password"
          type="password"
          autoComplete="current-password"
        />
        <Button type="submit" isSubmitting={state === "submitting"}>
          Sign in
        </Button>
      </Form>
      <div className={styles.links}>
        <Link to={href("/forgot-password")}>Forgot password?</Link>
        <Link to={href("/request-access")}>Request access</Link>
      </div>
    </>
  );
}
