import { isServer } from "@solidjs/web";
import { createFileRoute, isRedirect, redirect, useRouter } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { CheckboxField } from "~/components/checkbox-field/checkbox-field";
import { Link } from "~/components/link/link";
import { Modal } from "~/components/modal/modal";
import { isNetworkOrServerError } from "~/lib/network-error";
import { toast } from "~/lib/toast";
import { withStaleVersionRetry } from "~/lib/version-guard.client";
import { getListConfig, saveCollaborators } from "./config.functions";

import * as styles from "./config.css";

export const Route = createFileRoute("/_app/_home/config/$list")({
  loader: async ({ params }) => {
    const config = await getListConfig({ data: { slug: params.list } });
    if (!config.ok) {
      // Toasts live in the browser. A server-rendered request just lands
      // on home.
      if (!isServer) toast.error(config.error);
      throw redirect({ to: "/" });
    }
    return config;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData ? `${loaderData.listName} settings | Shorpin` : "List settings | Shorpin",
      },
    ],
  }),
  component: Config,
});

const formId = "config-form";

function Config() {
  const data = Route.useLoaderData();
  const params = Route.useParams();
  const router = useRouter();
  const [isSaving, setIsSaving] = createSignal(false);

  async function save(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const memberIds = new FormData(event.currentTarget)
      .getAll("member-ids")
      .filter((id) => typeof id === "string");

    setIsSaving(true);
    try {
      const result = await withStaleVersionRetry(() =>
        saveCollaborators({ data: { slug: params().list, memberIds } }),
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Changed collaborators");
      await router.navigate({ to: "/" });
    } catch (error) {
      if (isRedirect(error)) {
        await router.navigate(router.resolveRedirect(error).options);
        return;
      }
      toast.error(
        isNetworkOrServerError(error)
          ? "You're offline - connect to change collaborators"
          : "Failed to update collaborators. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal urlOnClose="/">
      <h2>{data().listName} — Admin</h2>

      <Modal.Body>
        <Show when={data().users.length > 0} fallback={<p>No other users yet.</p>}>
          <form id={formId} onSubmit={save}>
            <fieldset>
              <legend>Select collaborators</legend>
              <For each={data().users}>
                {(user) => (
                  <CheckboxField
                    id={user.id}
                    name="member-ids"
                    value={user.id}
                    checked={user.isMember}
                  >
                    {user.email}
                  </CheckboxField>
                )}
              </For>
            </fieldset>
          </form>
        </Show>
      </Modal.Body>

      <Modal.Actions>
        <Link
          variant="destructive"
          to="/lists/$list/confirm-delete"
          params={{ list: params().list }}
          class={styles.deleteList}
        >
          Delete list
        </Link>
        <Modal.Close>Close</Modal.Close>
        <Modal.Submit formId={formId} isSubmitting={isSaving()}>
          Save
        </Modal.Submit>
      </Modal.Actions>
    </Modal>
  );
}
