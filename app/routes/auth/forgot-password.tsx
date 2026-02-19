import { Form, Link, useNavigation } from "react-router";
import type { Route } from "./+types/forgot-password";
import { Button } from "~/components/button/button";

export { action } from "./forgot-password.server";

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
  const { state } = useNavigation();

  if (actionData?.success) {
    return (
      <main>
        <h1>Check your email</h1>
        <p>If an account exists for that address, you'll receive a password reset link shortly.</p>
        <Link to="/login">Back to sign in</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Forgot password</h1>
      <Form method="POST">
        <label>
          Email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <Button type="submit" isSubmitting={state === "submitting"}>
          Send reset link
        </Button>
      </Form>
      <Link to="/login">Back to sign in</Link>
    </main>
  );
}
