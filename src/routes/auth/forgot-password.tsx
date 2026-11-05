import { createForm, Field, Form } from "@formisch/solid/v2";
import { createFileRoute } from "@tanstack/solid-router";
import { useServerFn } from "@tanstack/solid-start";
import { createSignal, Show } from "solid-js";
import { Button } from "~/components/button/button";
import { Link } from "~/components/link/link";
import { AuthField } from "./auth-field";
import * as styles from "./auth-field.css";
import { sendResetLink } from "./forgot-password.functions";
import { zForgotPassword } from "./schemas";

export const Route = createFileRoute("/_auth/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password | Shorpin" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const sendResetLinkFn = useServerFn(sendResetLink);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [isSent, setIsSent] = createSignal(false);

  const form = createForm({ schema: zForgotPassword, validate: "blur", revalidate: "input" });

  async function submit(input: { email: string }) {
    setIsSubmitting(true);
    try {
      await sendResetLinkFn({ data: input });
      setIsSent(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Show
      when={!isSent()}
      fallback={
        <>
          <h1>Check your email</h1>
          <p>
            If an account exists for that address, you'll receive a password reset link shortly.
          </p>
          <Link to="/login">Back to sign in</Link>
        </>
      }
    >
      <h1>Forgot password</h1>
      <Form of={form} class={styles.form} onSubmit={submit}>
        <Field of={form} path={["email"]}>
          {(field) => <AuthField field={field} label="Email" type="email" autocomplete="email" />}
        </Field>
        <Button type="submit" isSubmitting={isSubmitting()}>
          Send reset link
        </Button>
      </Form>
      <Link to="/login">Back to sign in</Link>
    </Show>
  );
}
