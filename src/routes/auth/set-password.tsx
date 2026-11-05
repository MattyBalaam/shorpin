import { createForm, Field, Form, setErrors } from "@formisch/solid/v2";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { useServerFn } from "@tanstack/solid-start";
import { createSignal, For, Show } from "solid-js";
import { Button } from "~/components/button/button";
import { toast } from "~/lib/toast";
import { AuthField } from "./auth-field";
import * as styles from "./auth-field.css";
import { zSetPassword } from "./schemas";
import { getSetPasswordEmail, setPassword } from "./set-password.functions";

export const Route = createFileRoute("/_auth/set-password")({
  loader: () => getSetPasswordEmail(),
  head: () => ({ meta: [{ title: "Set password | Shorpin" }] }),
  component: SetPassword,
});

function SetPassword() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();
  const setPasswordFn = useServerFn(setPassword);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const form = createForm({ schema: zSetPassword, validate: "blur", revalidate: "input" });

  async function submit(input: { password: string; "confirm-password": string }) {
    setIsSubmitting(true);
    try {
      const { formError } = await setPasswordFn({ data: input });
      if (formError) {
        setErrors(form, { errors: [formError] });
        return;
      }
      toast.success("Password updated successfully");
      await navigate({ to: "/" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1>Set new password</h1>
      <Form of={form} class={styles.form} onSubmit={submit}>
        <input type="hidden" autocomplete="username" value={data().email} readonly />
        <Show when={form.errors}>
          {(errors) => <For each={errors()}>{(error) => <p>{error}</p>}</For>}
        </Show>
        <Field of={form} path={["password"]}>
          {(field) => (
            <AuthField
              field={field}
              label="New password"
              type="password"
              autocomplete="new-password"
            />
          )}
        </Field>
        <Field of={form} path={["confirm-password"]}>
          {(field) => (
            <AuthField
              field={field}
              label="Confirm password"
              type="password"
              autocomplete="new-password"
            />
          )}
        </Field>
        <Button type="submit" isSubmitting={isSubmitting()}>
          Update password
        </Button>
      </Form>
    </>
  );
}
