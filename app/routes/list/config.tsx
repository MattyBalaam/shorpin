import { Form, useNavigation } from "react-router";
import type { Route } from "./+types/config";
import { Button } from "~/components/button/button";

export { loader, action } from "./config.server";

export const handle = {
  breadcrumbs: [
    {
      label: (data: any) => data?.listName || "List",
      to: (_data: unknown, pathname: string) => pathname.replace("/config", ""),
    },
    { label: "Settings" },
  ],
};

export default function Config({ loaderData }: Route.ComponentProps) {
  const { isOwner, users } = loaderData;
  const { state } = useNavigation();

  if (!isOwner) {
    return <p>Only the list owner can manage settings.</p>;
  }

  return (
    <>
      <h2>Collaborators</h2>

      {users.length === 0 ? (
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
          <Button type="submit" isSubmitting={state === "submitting"}>
            Save
          </Button>
        </Form>
      )}
    </>
  );
}
