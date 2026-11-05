import { createFileRoute, isRedirect, useRouter } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { CheckboxField } from "~/components/checkbox-field/checkbox-field";
import { Modal } from "~/components/modal/modal";
import { isNetworkOrServerError } from "~/lib/network-error";
import { toast } from "~/lib/toast";
import { withStaleVersionRetry } from "~/lib/version-guard.browser";
import { getSignUps, handleSignUps } from "./sign-ups.functions";

// React Router streamed the list (the dialog opened, then filled in). Here
// the loader awaits it: home's "pending" link shows a spinner meanwhile, and
// a failed load reaches the error boundary rather than an empty dialog.
export const Route = createFileRoute("/_app/_home/sign-ups")({
  loader: () => getSignUps(),
  head: () => ({ meta: [{ title: "Sign-ups | Shorpin" }] }),
  component: SignUps,
});

const formId = "sign-ups-form";

function SignUps() {
  const signUps = Route.useLoaderData();
  const router = useRouter();
  const [isSaving, setIsSaving] = createSignal(false);

  async function save(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const ids = new FormData(event.currentTarget)
      .getAll("ids")
      .filter((id) => typeof id === "string");
    if (ids.length === 0) return;

    setIsSaving(true);
    try {
      const result = await withStaleVersionRetry(() => handleSignUps({ data: { ids } }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Sign-ups handled.");
      await router.navigate({ to: "/" });
      // Home stays on screen behind the dialog, so its loader (and the
      // pending count) only re-runs when invalidated.
      await router.invalidate();
    } catch (error) {
      if (isRedirect(error)) {
        await router.navigate(router.resolveRedirect(error).options);
        return;
      }
      toast.error(
        isNetworkOrServerError(error)
          ? "You're offline - connect to update sign-ups"
          : "Failed to update sign-ups. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal urlOnClose="/">
      <h2>Pending sign-ups</h2>

      <Modal.Body>
        <Show when={signUps().length > 0} fallback={<p>No pending sign-ups.</p>}>
          <form id={formId} onSubmit={save}>
            <For each={signUps()}>
              {(signUp) => (
                <CheckboxField id={signUp.id} name="ids" value={signUp.id}>
                  {signUp.first_name} {signUp.last_name} — {signUp.email} at{" "}
                  <time datetime={signUp.created_at}>
                    {new Date(signUp.created_at).toLocaleDateString()}
                  </time>
                </CheckboxField>
              )}
            </For>
          </form>
        </Show>
      </Modal.Body>

      <Modal.Actions>
        <Modal.Close>Close</Modal.Close>
        <Modal.Submit formId={formId} isSubmitting={isSaving()}>
          Mark as handled
        </Modal.Submit>
      </Modal.Actions>
    </Modal>
  );
}
