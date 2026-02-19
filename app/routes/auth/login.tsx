import { Form, Link, href, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { Button } from "~/components/button/button";
import { useForm } from "@conform-to/react/future";
import { zLogin } from "./schemas";

export { action } from "./login.server";

export default function Login({ actionData }: Route.ComponentProps) {
  const { state } = useNavigation();
  const { form, fields } = useForm(zLogin, {
    lastResult: actionData,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <>
      <h1>Sign in</h1>
      <Form method="POST" {...form.props}>
        {form.errors?.map((error, i) => <p key={i}>{error}</p>)}
        <label htmlFor={fields.email.id}>Email</label>
        <input
          type="email"
          name={fields.email.name}
          id={fields.email.id}
          required
          autoComplete="email"
        />
        {fields.email.errors?.map((error, i) => <p key={i}>{error}</p>)}
        <label htmlFor={fields.password.id}>Password</label>
        <input
          type="password"
          name={fields.password.name}
          id={fields.password.id}
          required
          autoComplete="current-password"
        />
        {fields.password.errors?.map((error, i) => <p key={i}>{error}</p>)}
        <Button type="submit" isSubmitting={state === "submitting"}>
          Sign in
        </Button>
      </Form>
      <Link to={href("/forgot-password")}>Forgot password?</Link>
    </>
  );
}
