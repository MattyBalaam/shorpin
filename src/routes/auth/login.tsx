import { createForm, Field, Form, setErrors } from "@formisch/solid/v2";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { useServerFn } from "@tanstack/solid-start";
import { createSignal, For, Show } from "solid-js";
import { Button } from "~/components/button/button";
import { Link } from "~/components/link/link";
import { toast } from "~/lib/toast";
import { AuthField } from "./auth-field";
import * as styles from "./auth-field.css";
import * as devStyles from "./login.dev.css";
import { signIn } from "./login.functions";
import { zLogin } from "./schemas";

export const Route = createFileRoute("/_auth/login")({
  head: () => ({ meta: [{ title: "Sign in | Shorpin" }] }),
  component: Login,
});

// Quick-login shortcuts for the mock server's seeded users. React Router
// swapped in a separate login.dev route in these modes; here the shortcuts
// are a constant that's empty, and dropped, in other builds.
const DEV_USERS =
  import.meta.env.MODE === "mock" || import.meta.env.MODE === "preview"
    ? ([
        { email: "owner@test.com", label: "Owner" },
        { email: "collab@test.com", label: "Collaborator" },
      ] as const)
    : [];

function Login() {
  const navigate = useNavigate();
  const signInFn = useServerFn(signIn);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const form = createForm({
    schema: zLogin,
    validate: "blur",
    revalidate: "input",
  });

  async function submit(input: { email: string; password: string }) {
    setIsSubmitting(true);
    try {
      const { formError } = await signInFn({ data: input });
      if (formError) {
        setErrors(form, { errors: [formError] });
        return;
      }
      toast.success("Welcome back!");
      await navigate({ to: "/" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <h1>{DEV_USERS.length > 0 ? "Sign in (Dev Mode)" : "Sign in"}</h1>
      <Form of={form} class={styles.form} onSubmit={submit}>
        <Show when={form.errors}>
          {(errors) => <For each={errors()}>{(error) => <p>{error}</p>}</For>}
        </Show>
        <Field of={form} path={["email"]}>
          {(field) => <AuthField field={field} label="Email" type="email" autocomplete="email" />}
        </Field>
        <Field of={form} path={["password"]}>
          {(field) => (
            <AuthField
              field={field}
              label="Password"
              type="password"
              autocomplete="current-password"
            />
          )}
        </Field>
        <Button type="submit" isSubmitting={isSubmitting()}>
          Sign in
        </Button>
      </Form>
      <div class={styles.links}>
        <Link to="/forgot-password">Forgot password?</Link>
        <Link to="/request-access">Request access</Link>
      </div>

      <Show when={DEV_USERS.length > 0}>
        <div class={devStyles.devSection}>
          <p class={devStyles.devHeading}>Dev quick-login</p>
          <For each={DEV_USERS}>
            {(user) => (
              <button
                type="button"
                class={devStyles.devButton}
                onClick={() => submit({ email: user.email, password: "password" })}
              >
                {user.label} <span class={devStyles.devEmail}>{user.email}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </>
  );
}
