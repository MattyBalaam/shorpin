import { Form } from "react-router";
import type { Route } from "./+types/config";
import { Modal } from "~/components/modal/modal";
import { use, Suspense } from "react";

export { loader, action } from "./config.server";

const formId = "config-form";

type User = { id: string; email: string; isMember: boolean };

function UsersList({ usersPromise }: { usersPromise: Promise<User[]> }) {
  const users = use(usersPromise);

  if (users.length === 0) {
    return <p>No other users yet.</p>;
  }

  return (
    <Form id={formId} method="POST">
      <fieldset>
        <legend>Select collaborators</legend>
        {users.map(({ id, email, isMember }) => (
          <label key={id}>
            <input
              type="checkbox"
              name="member-ids"
              value={id}
              defaultChecked={isMember}
            />
            {email}
          </label>
        ))}
      </fieldset>
    </Form>
  );
}

export default function Config({
  loaderData: { users, listName },
}: Route.ComponentProps) {
  return (
    <Modal>
      <h2>{listName} — Settings</h2>

      <Suspense fallback={null}>
        <UsersList usersPromise={users} />
      </Suspense>

      <Modal.Actions>
        <Modal.Close>Close</Modal.Close>
        <Modal.Submit formId={formId}>Save</Modal.Submit>
      </Modal.Actions>
    </Modal>
  );
}
