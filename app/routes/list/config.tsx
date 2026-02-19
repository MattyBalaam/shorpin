import { Form } from "react-router";
import type { Route } from "./+types/config";
import { Modal } from "~/components/modal/modal";

export { loader, action } from "./config.server";

const formId = "config-form";

export default function Config({
  loaderData: { users, listName },
}: Route.ComponentProps) {
  return (
    <Modal>
      <h2>{listName} — Settings</h2>

      {users.length === 0 ? (
        <p>No other users yet.</p>
      ) : (
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
      )}

      <Modal.Actions>
        <Modal.Close>Close</Modal.Close>
        <Modal.Submit formId={formId}>Save</Modal.Submit>
      </Modal.Actions>
    </Modal>
  );
}
