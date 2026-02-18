import { Form, useNavigation } from "react-router";
import type { Route } from "./+types/config";
import { Button } from "~/components/button/button";

export { loader, action } from "./config.server";

export const handle = {
  breadcrumbs: [
    {
      label: (data: any) => data?.listName || "List",
      to: (_data: any, pathname: string) => pathname.replace("/config", ""),
    },
    { label: "Settings" },
  ],
};

export default function Config({ loaderData, actionData }: Route.ComponentProps) {
  const { isOwner, members } = loaderData;
  const { state } = useNavigation();

  if (!isOwner) {
    return <p>Only the list owner can manage settings.</p>;
  }

  return (
    <>
      <h2>Collaborators</h2>

      {members.length > 0 ? (
        <ul>
          {members.map(({ email }) => (
            <li key={email}>{email}</li>
          ))}
        </ul>
      ) : (
        <p>No collaborators yet.</p>
      )}

      <Form method="POST">
        <label htmlFor="member-email">Add by email</label>
        <input
          id="member-email"
          type="email"
          name="member-email"
          placeholder="collaborator@example.com"
          autoComplete="off"
          required
        />
        {actionData?.error && <p>{actionData.error}</p>}
        <Button type="submit" isSubmitting={state === "submitting"}>
          Add collaborator
        </Button>
      </Form>
    </>
  );
}
