import { createForm, Field, Form, setErrors } from "@formisch/solid/v2";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { useServerFn } from "@tanstack/solid-start";
import { createSignal, For, Show } from "solid-js";
import { Button } from "~/components/button/button";
import { Link } from "~/components/link/link";
import { type Backend, canChooseBackend } from "~/lib/supabase-backend";
import { toast } from "~/lib/toast";
import { AuthField } from "./auth-field";
import * as styles from "./auth-field.css";
import * as devStyles from "./login.dev.css";
import { getBackend, signIn, signInAsPreviewUser } from "./login.functions";
import { zLogin } from "./schemas";

export const Route = createFileRoute("/_auth/login")({
  // Preview builds with a test project configured offer it beside the mock.
  loader: async (): Promise<{ backend: Backend; previewUser: string | null }> =>
    canChooseBackend ? getBackend() : { backend: "mock", previewUser: null },
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
  const data = Route.useLoaderData();
  const savedBackend = () => data().backend;
  const [backend, setBackend] = createSignal<Backend>(savedBackend());
  const navigate = useNavigate();
  const signInFn = useServerFn(signIn);
  const signInAsPreviewUserFn = useServerFn(signInAsPreviewUser);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const form = createForm({
    schema: zLogin,
    validate: "blur",
    revalidate: "input",
  });

  async function submit(input: { email: string; password: string }) {
    const chosen = backend();
    await signInWith(chosen, () =>
      signInFn({ data: canChooseBackend ? { ...input, backend: chosen } : input }),
    );
  }

  async function signInWith(chosen: Backend, request: () => Promise<{ formError: string | null }>) {
    setIsSubmitting(true);
    try {
      const { formError } = await request();
      if (formError) {
        setErrors(form, { errors: [formError] });
        return;
      }
      // A new backend reloads, so the realtime client (supabase.client.ts)
      // is built again for it.
      if (chosen !== savedBackend()) {
        window.location.assign("/");
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
        <Show when={canChooseBackend}>
          <fieldset class={devStyles.backend}>
            <legend class={devStyles.devHeading}>Backend</legend>
            <label class={devStyles.backendOption}>
              <input
                type="radio"
                name="backend"
                value="mock"
                checked={backend() === "mock"}
                onChange={() => setBackend("mock")}
              />
              Mock <span class={devStyles.devEmail}>in-memory, resets on deploy</span>
            </label>
            <label class={devStyles.backendOption}>
              <input
                type="radio"
                name="backend"
                value="test"
                checked={backend() === "test"}
                onChange={() => setBackend("test")}
              />
              Supabase test project <span class={devStyles.devEmail}>real auth and realtime</span>
            </label>
          </fieldset>
        </Show>
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

      <Show when={backend() === "test" ? data().previewUser : undefined}>
        {(email) => (
          <div class={devStyles.devSection}>
            <p class={devStyles.devHeading}>Preview user</p>
            <button
              type="button"
              class={devStyles.devButton}
              onClick={() => signInWith("test", () => signInAsPreviewUserFn())}
            >
              Sign in as preview user <span class={devStyles.devEmail}>{email()}</span>
            </button>
          </div>
        )}
      </Show>

      <Show when={DEV_USERS.length > 0 && backend() === "mock"}>
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
