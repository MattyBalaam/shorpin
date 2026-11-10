import { useForm } from "@conform-to/react/future";
import { useState } from "react";
import { Form, href, useLoaderData, useNavigation } from "react-router";
import { Button } from "~/components/button/button";
import { Link } from "~/components/link/link";
// Intentionally NOT importing from ./+types/login.dev or ./+types/login.
// This file is only registered as a route in mock/preview mode, so typegen
// only generates +types/login.dev.ts in that mode — and +types/login.ts only
// in production mode. No generated file exists in both modes simultaneously.
// Types are derived from react-router and login.server directly instead.
import type { MetaFunction } from "react-router";
import type { action, loader } from "./login.server";
import type { Backend } from "~/lib/supabase-backend";
import { AuthField } from "./auth-field";
import * as styles from "./auth-field.css";
import * as devStyles from "./login.dev.css";
import { zLogin } from "./schemas";

export { action, loader } from "./login.server";

export const meta: MetaFunction = () => [{ title: "Sign in | Shorpin" }];

const DEV_USERS = [
  { email: "owner@test.com", label: "Owner" },
  { email: "collab@test.com", label: "Collaborator" },
] as const;

export default function Login({ actionData }: { actionData?: Awaited<ReturnType<typeof action>> }) {
  const { state } = useNavigation();
  // Preview builds with a test project configured offer it beside the mock
  // (see supabase-backend.ts). Quick-login always signs in to the mock.
  const { canChooseBackend, backend: savedBackend, previewUsers } = useLoaderData<typeof loader>();
  const [backend, setBackend] = useState<Backend>(savedBackend);
  const { form, fields } = useForm(zLogin, {
    lastResult: actionData,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <>
      <h1>Sign in (Dev Mode)</h1>
      <Form method="POST" {...form.props} className={styles.form}>
        {form.errors?.map((error, i) => (
          <p key={i}>{error}</p>
        ))}
        {canChooseBackend && (
          <fieldset className={devStyles.backend}>
            <legend className={devStyles.devHeading}>Backend</legend>
            <label className={devStyles.backendOption}>
              <input
                type="radio"
                name="backend"
                value="mock"
                checked={backend === "mock"}
                onChange={() => setBackend("mock")}
              />
              Mock <span className={devStyles.devEmail}>in-memory, resets on deploy</span>
            </label>
            <label className={devStyles.backendOption}>
              <input
                type="radio"
                name="backend"
                value="test"
                checked={backend === "test"}
                onChange={() => setBackend("test")}
              />
              Supabase test project{" "}
              <span className={devStyles.devEmail}>real auth and realtime</span>
            </label>
          </fieldset>
        )}
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

      {backend === "test" && previewUsers && (
        // The test project's counterparts of the quick-login users, seeded
        // with the same lists (app/lib/preview-user.server.ts).
        <div className={devStyles.devSection}>
          <p className={devStyles.devHeading}>Preview users</p>
          {(
            [
              ["owner", "Owner", previewUsers.owner],
              ["collab", "Collaborator", previewUsers.collab],
            ] as const
          ).map(([role, label, email]) => (
            <form key={role} method="POST">
              <input type="hidden" name="intent" value="preview-user" />
              <input type="hidden" name="role" value={role} />
              <button type="submit" className={devStyles.devButton}>
                {label} <span className={devStyles.devEmail}>{email}</span>
              </button>
            </form>
          ))}
        </div>
      )}

      {backend === "mock" && (
        <div className={devStyles.devSection}>
          <p className={devStyles.devHeading}>Dev quick-login</p>
          {DEV_USERS.map(({ email, label }) => (
            <form key={email} method="POST">
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="password" value="password" />
              <button type="submit" className={devStyles.devButton}>
                {label} <span className={devStyles.devEmail}>{email}</span>
              </button>
            </form>
          ))}
        </div>
      )}
    </>
  );
}
