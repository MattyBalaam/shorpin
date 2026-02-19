import { Form } from "react-router";
import type { Route } from "./+types/sign-ups";
import { Button } from "~/components/button/button";
import { Modal } from "~/components/modal/modal";

export { loader, action } from "./sign-ups.server";

export default function SignUps({ loaderData }: Route.ComponentProps) {
  const { signUps } = loaderData;

  return (
    <Modal>
      <h2>Pending sign-ups</h2>

      {signUps.length === 0 ? (
        <p>No pending sign-ups.</p>
      ) : (
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
      )}
    </Modal>
  );
}
