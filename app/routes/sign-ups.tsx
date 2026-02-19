import { Form } from "react-router";
import type { Route } from "./+types/sign-ups";
import { Button } from "~/components/button/button";

export { loader, action } from "./sign-ups.server";

export const handle = {
  breadcrumb: { label: "Sign-ups" },
};

export default function SignUps({ loaderData }: Route.ComponentProps) {
  const { signUps } = loaderData;

  if (signUps.length === 0) {
    return <p>No pending sign-ups.</p>;
  }

  return (
    <Form method="POST">
      <ul>
        {signUps.map(({ id, email, first_name, last_name, created_at }) => (
          <li key={id}>
            <label>
              <input type="checkbox" name="ids" value={id} />
              {first_name} {last_name} — {email}{" "}
              <small>{new Date(created_at).toLocaleDateString()}</small>
            </label>
          </li>
        ))}
      </ul>
      <Button type="submit">Mark as handled</Button>
    </Form>
  );
}
