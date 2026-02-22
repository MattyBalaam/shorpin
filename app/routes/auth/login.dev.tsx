import { Form, href, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { Button } from "~/components/button/button";
import { useForm } from "@conform-to/react/future";
import { zLogin } from "./schemas";
import { AuthField } from "./auth-field";
import * as styles from "./auth-field.css";
import { Link } from "~/components/link/link";
import * as devStyles from "./login.dev.css";

export { action } from "./login.server";

const DEV_USERS = [
  { email: "owner@test.com", label: "Owner" },
  { email: "collab@test.com", label: "Collaborator" },
] as const;

export default function Login({ actionData }: Route.ComponentProps) {
  const { state } = useNavigation();
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
        <AuthField
          meta={fields.email}
          label="Email"
          type="email"
          autoComplete="email"
        />
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
    </>
  );
}
