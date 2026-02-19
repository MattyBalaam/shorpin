import { Form } from "react-router";
import type { Route } from "./+types/sign-ups";
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
        <Form id="sign-ups-form" method="POST">
          {signUps.map(({ id, email, first_name, last_name, created_at }) => (
            <div key={id}>
              <input type="checkbox" name="ids" value={id} />

              <label htmlFor={id}>
                {first_name} {last_name} — {email}{" "}
                <small>{new Date(created_at).toLocaleDateString()}</small>
              </label>
            </div>
          ))}
        </Form>
      )}

      <Modal.Actions>
        <Modal.Close>Close</Modal.Close>
        <Modal.Submit form="sign-ups-form">Mark as handled</Modal.Submit>
      </Modal.Actions>
    </Modal>
  );
}
