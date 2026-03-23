import { Suspense, use } from "react";
import { Form, href } from "react-router";
import { CheckboxField } from "~/components/checkbox-field/checkbox-field";
import { Link } from "~/components/link/link";
import { Modal } from "~/components/modal/modal";
import type { Route } from "./+types/config";

import * as styles from "./config.css";

export { action, loader } from "./config.server";

export const meta: Route.MetaFunction = ({ data }) => {
  const listName = data?.listName;
  return [
    {
      title: listName ? `${listName} settings | Shorpin` : "List settings | Shorpin",
    },
  ];
};

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
          <CheckboxField key={id} id={id} name="member-ids" value={id} defaultChecked={isMember}>
            {email}
          </CheckboxField>
        ))}
      </fieldset>
    </Form>
  );
}

export default function Config({
  loaderData: { users, listName },
  params: { list },
}: Route.ComponentProps) {
  return (
    <Modal urlOnClose={href("/")}>
      <h2>{listName} — Admin</h2>

      <Suspense fallback={null}>
        <UsersList usersPromise={users} />
      </Suspense>

      <Modal.Actions>
        <Link
          variant="destructive"
          to={href("/lists/:list/confirm-delete", { list })}
          className={styles.deleteList}
        >
          Delete list
        </Link>
        <Modal.Close>Close</Modal.Close>
        <Modal.Submit formId={formId}>Save</Modal.Submit>
      </Modal.Actions>
    </Modal>
  );
}
