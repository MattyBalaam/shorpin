import { Form, href } from "react-router";
import { CheckboxField } from "~/components/checkbox-field/checkbox-field";
import { Modal } from "~/components/modal/modal";
import type { Route } from "./+types/sign-ups";

export { action, loader } from "./sign-ups.server";

export const meta: Route.MetaFunction = () => [{ title: "Sign-ups | Shorpin" }];

const formId = "sign-ups-form";

export default function SignUps({ loaderData }: Route.ComponentProps) {
  const { signUps } = loaderData;

  return (
    <Modal urlOnClose={href("/")}>
      <h2>Pending sign-ups</h2>

      {signUps.length === 0 ? (
        <p>No pending sign-ups.</p>
      ) : (
        <Form id={formId} method="POST">
          {signUps.map(({ id, email, first_name, last_name, created_at }) => (
            <CheckboxField key={id} id={id} name="ids" value={id}>
              {first_name} {last_name} — {email} at{" "}
              <time dateTime={created_at}>{new Date(created_at).toLocaleDateString()}</time>
            </CheckboxField>
          ))}
        </Form>
      )}

      <Modal.Actions>
        <Modal.Close>Close</Modal.Close>
        <Modal.Submit formId={formId}>Mark as handled</Modal.Submit>
      </Modal.Actions>
    </Modal>
  );
}
