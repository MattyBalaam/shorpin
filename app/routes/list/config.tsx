import { Form } from "react-router";
import type { Route } from "./+types/config";
import { Modal } from "~/components/modal/modal";

export { loader, action } from "./config.server";

export default function Config({ loaderData }: Route.ComponentProps) {
  const { isOwner, users, listName } = loaderData;

  return (
    <Modal>
      <h2>{listName} — Settings</h2>

      {!isOwner ? (
        <p>Only the list owner can manage settings.</p>
      ) : users.length === 0 ? (
        <p>No other users yet.</p>
      ) : (
        <Form method="POST">
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
          <Modal.Submit>Save</Modal.Submit>
        </Form>
      )}

      <Modal.Actions>
        <Modal.Close>Close</Modal.Close>
      </Modal.Actions>
    </Modal>
  );
}
