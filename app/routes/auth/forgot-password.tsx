import { useForm } from "@conform-to/react/future";
import { Form, href, Link, useNavigation } from "react-router";
import { Button } from "~/components/button/button";
import type { Route } from "./+types/forgot-password";
import { AuthField } from "./auth-field";
import * as styles from "./auth-field.css";
import { zForgotPassword } from "./schemas";

export { action } from "./forgot-password.server";

export const meta: Route.MetaFunction = () => [{ title: "Forgot password | Shorpin" }];

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
  const { state } = useNavigation();
  const { form, fields } = useForm(zForgotPassword, {
    lastResult: actionData?.result,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  if (actionData?.success) {
    return (
      <>
        <h1>Check your email</h1>
        <p>If an account exists for that address, you'll receive a password reset link shortly.</p>
        <Link to={href("/login")}>Back to sign in</Link>
      </>
    );
  }

  return (
    <>
      <h1>Forgot password</h1>
      <Form method="POST" {...form.props} className={styles.form}>
        {form.errors?.map((error, i) => (
          <p key={i}>{error}</p>
        ))}
        <AuthField meta={fields.email} label="Email" type="email" autoComplete="email" />
        <Button type="submit" isSubmitting={state === "submitting"}>
          Send reset link
        </Button>
      </Form>
      <Link to={href("/login")}>Back to sign in</Link>
    </>
  );
}
