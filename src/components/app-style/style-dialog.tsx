import { isRedirect, useRouter } from "@tanstack/solid-router";
import { createSignal, createUniqueId, For } from "solid-js";
import { Modal } from "~/components/modal/modal";
import * as clickableStyles from "~/components/shared/clickable-element.css";
import { isNetworkOrServerError } from "~/lib/network-error";
import { toast } from "~/lib/toast";
import { withStaleVersionRetry } from "~/lib/version-guard.browser";
import { APP_STYLE_ATTRIBUTE, appStyles, type AppStyle, INHERIT_APP_STYLE } from "~/lib/app-style";
import * as styles from "./style-picker.css";

const styleNames = Object.keys(appStyles) as AppStyle[];

const formId = "style-form";

const OFFLINE_MESSAGE = "You're offline - connect to change the style";

interface StyleDialogProps {
  title: string;
  /** The saved style; null when following the viewer's own (see `inherit`). */
  value: AppStyle | null;
  /** Where Cancel, Escape or a backdrop click go: the page behind. */
  urlOnClose: string;
  /**
   * Offers a "My style" option that saves as INHERIT_APP_STYLE (no
   * override), previewed in this style — the viewer's own.
   */
  inherit?: AppStyle;
  /**
   * Saves the picked value (a style name, or INHERIT_APP_STYLE) and goes
   * back to the page behind. Resolves to an error message to stay open.
   */
  onSave: (style: string) => Promise<string | void>;
}

type Option = { value: string; style: AppStyle; label: string; description: string };

// The body of a style route (`/style`, `/lists/$list/style`): its own URL,
// so the page behind stays as it was underneath. Nothing changes until
// Save: picking an option only moves the selection, and each option
// previews itself in miniature.
export function StyleDialog(props: StyleDialogProps) {
  const headingId = createUniqueId();
  const router = useRouter();
  const [isSaving, setIsSaving] = createSignal(false);

  const options = (): Option[] => [
    ...(props.inherit
      ? [
          {
            value: INHERIT_APP_STYLE,
            style: props.inherit,
            label: "My style",
            description: `Follow your own style (${appStyles[props.inherit].label})`,
          },
        ]
      : []),
    ...styleNames.map((name) => ({ value: name, style: name, ...appStyles[name] })),
  ];

  // Saving is online-only: offline, or when the request fails, the dialog
  // stays open with a toast rather than queueing the change.
  async function save(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const style = new FormData(event.currentTarget).get("style");
    if (typeof style !== "string") return;
    if (!navigator.onLine) {
      toast.error(OFFLINE_MESSAGE);
      return;
    }

    setIsSaving(true);
    try {
      const error = await withStaleVersionRetry(() => props.onSave(style));
      if (error) toast.error(error);
    } catch (error) {
      // A stale session: on to /login.
      if (isRedirect(error)) {
        await router.navigate(router.resolveRedirect(error).options);
        return;
      }
      if (!isNetworkOrServerError(error)) throw error;
      toast.error(OFFLINE_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal urlOnClose={props.urlOnClose} labelledBy={headingId}>
      <h2 id={headingId}>{props.title}</h2>
      <Modal.Body>
        <form id={formId} onSubmit={save}>
          <div role="radiogroup" aria-labelledby={headingId} class={styles.options}>
            <For each={options()}>
              {(option) => (
                <label class={styles.option} {...{ [APP_STYLE_ATTRIBUTE]: option.style }}>
                  <input
                    type="radio"
                    name="style"
                    value={option.value}
                    checked={(props.value ?? INHERIT_APP_STYLE) === option.value}
                    class={styles.radio}
                  />
                  <span class={styles.label}>{option.label}</span>
                  <span class={styles.description}>{option.description}</span>
                  <span class={styles.preview} aria-hidden="true">
                    <span class={styles.badge}>New</span>
                    <button
                      type="button"
                      tabindex="-1"
                      class={[clickableStyles.variant.solid, styles.previewButton]}
                    >
                      Add
                    </button>
                  </span>
                </label>
              )}
            </For>
          </div>
        </form>
      </Modal.Body>
      <Modal.Actions>
        <Modal.Close>Cancel</Modal.Close>
        <Modal.Submit formId={formId} isSubmitting={isSaving()}>
          Save
        </Modal.Submit>
      </Modal.Actions>
    </Modal>
  );
}
