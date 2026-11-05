import { createForm, Field, Form, setErrors } from "@formisch/solid/v2";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { useServerFn } from "@tanstack/solid-start";
import { createSignal, For, Show } from "solid-js";
import { Button } from "~/components/button/button";
import { toast } from "~/lib/toast";
import { AuthField } from "./auth-field";
import * as styles from "./auth-field.css";
import { requestAccess } from "./request-access.functions";
import { zRequestAccess } from "./schemas";

export const Route = createFileRoute("/_auth/request-access")({
  head: () => ({ meta: [{ title: "Request access | Shorpin" }] }),
  component: RequestAccess,
});

function RequestAccess() {
  const navigate = useNavigate();
  const requestAccessFn = useServerFn(requestAccess);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const form = createForm({ schema: zRequestAccess, validate: "blur", revalidate: "input" });

  async function submit(input: { email: string; first_name: string; last_name: string }) {
    setIsSubmitting(true);
    try {
      const { formError } = await requestAccessFn({ data: input });
      if (formError) {
        setErrors(form, { errors: [formError] });
        return;
      }
      toast.success("Your account is being verified. We'll be in touch soon.");
      await navigate({ to: "/login" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1>Request access</h1>
      <Form of={form} class={styles.form} onSubmit={submit}>
        <Show when={form.errors}>
          {(errors) => <For each={errors()}>{(error) => <p>{error}</p>}</For>}
        </Show>
        <Field of={form} path={["first_name"]}>
          {(field) => (
            <AuthField field={field} label="First name" type="text" autocomplete="given-name" />
          )}
        </Field>
        <Field of={form} path={["last_name"]}>
          {(field) => (
            <AuthField field={field} label="Last name" type="text" autocomplete="family-name" />
          )}
        </Field>
        <Field of={form} path={["email"]}>
          {(field) => <AuthField field={field} label="Email" type="email" autocomplete="email" />}
        </Field>
        <Button type="submit" isSubmitting={isSubmitting()}>
          Request access
        </Button>
      </Form>
    </>
  );
}
