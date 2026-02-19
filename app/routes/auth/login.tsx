import { Form, Link } from "react-router";
import type { Route } from "./+types/login";
import { Button } from "~/components/button/button";
import { useNavigation } from "react-router";

export { action } from "./login.server";

export default function Login({ actionData }: Route.ComponentProps) {
  const { state } = useNavigation();

  return (
    <>
      <h1>Sign in</h1>
      <Form method="POST">
        <label>
          Email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </label>
        {actionData?.error && <p>{actionData.error}</p>}
        <Button type="submit" isSubmitting={state === "submitting"}>
          Sign in
        </Button>
      </Form>
      <Link to="/forgot-password">Forgot password?</Link>
    </>
  );
}
