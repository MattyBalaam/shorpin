import { Suspense, use } from "react";
import { Form, href } from "react-router";
import { CheckboxField } from "~/components/checkbox-field/checkbox-field";
import { Modal } from "~/components/modal/modal";
import type { Route } from "./+types/sign-ups";

export { action, loader } from "./sign-ups.server";

export const meta: Route.MetaFunction = () => [{ title: "Sign-ups | Shorpin" }];

const formId = "sign-ups-form";

function SignUpsList({
  signUpsPromise,
}: {
  signUpsPromise: Route.ComponentProps["loaderData"]["signUps"];
}) {
  const signUps = use(signUpsPromise);

  if (signUps.length === 0) {
    return <p>No pending sign-ups.</p>;
  }

  return (
    <Form id={formId} method="POST">
      {signUps.map(({ id, email, first_name, last_name, created_at }) => (
        <CheckboxField key={id} id={id} name="ids" value={id}>
          {first_name} {last_name} — {email} at{" "}
          <time dateTime={created_at}>{new Date(created_at).toLocaleDateString()}</time>
        </CheckboxField>
      ))}
    </Form>
  );
}

export default function SignUps({ loaderData: { signUps } }: Route.ComponentProps) {
  return (
    <Modal urlOnClose={href("/")}>
      <h2>Pending sign-ups</h2>

      <Suspense fallback={null}>
        <SignUpsList signUpsPromise={signUps} />
      </Suspense>

      <Modal.Actions>
        <Modal.Close>Close</Modal.Close>
        <Modal.Submit formId={formId}>Mark as handled</Modal.Submit>
      </Modal.Actions>
    </Modal>
  );
}
