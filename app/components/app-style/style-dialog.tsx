import { useId } from "react";
import { Form } from "react-router";
import { Modal } from "~/components/modal/modal";
import * as clickableStyles from "~/components/shared/clickable-element.css";
import { isNetworkOrServerError } from "~/lib/network-error";
import { toast } from "~/lib/toast";
import { withStaleVersionRetry } from "~/lib/version-guard.client";
import { APP_STYLE_ATTRIBUTE, appStyles, type AppStyle, INHERIT_APP_STYLE } from "~/lib/app-style";
import * as styles from "./style-picker.css";

const styleNames = Object.keys(appStyles) as AppStyle[];

const formId = "style-form";

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
}

type Option = { value: string; style: AppStyle; label: string; description: string };

// The body of a style route (`/style`, `/lists/:list/style`): its own URL,
// so the action that saves the choice lives there too and redirects back.
// Nothing changes until Save: picking an option only moves the selection, and
// each option previews itself in miniature.
export function StyleDialog({ title, value, urlOnClose, inherit }: StyleDialogProps) {
  const headingId = useId();

  const options: Option[] = [
    ...(inherit
      ? [
          {
            value: INHERIT_APP_STYLE,
            style: inherit,
            label: "My style",
            description: `Follow your own style (${appStyles[inherit].label})`,
          },
        ]
      : []),
    ...styleNames.map((name) => ({ value: name, style: name, ...appStyles[name] })),
  ];

  return (
    <Modal urlOnClose={urlOnClose} labelledBy={headingId}>
      <h2 id={headingId}>{title}</h2>
      <Modal.Body>
        <Form id={formId} method="post" replace>
          <div role="radiogroup" aria-labelledby={headingId} className={styles.options}>
            {options.map((option) => (
              <label
                key={option.value}
                className={styles.option}
                {...{ [APP_STYLE_ATTRIBUTE]: option.style }}
              >
                <input
                  type="radio"
                  name="style"
                  value={option.value}
                  defaultChecked={(value ?? INHERIT_APP_STYLE) === option.value}
                  className={styles.radio}
                />
                <span className={styles.label}>{option.label}</span>
                <span className={styles.description}>{option.description}</span>
                <span className={styles.preview} aria-hidden="true">
                  <span className={styles.badge}>New</span>
                  <button
                    type="button"
                    tabIndex={-1}
                    className={`${clickableStyles.variant.primary} ${styles.previewButton}`}
                  >
                    Add
                  </button>
                </span>
              </label>
            ))}
          </div>
        </Form>
      </Modal.Body>
      <Modal.Actions>
        <Modal.Close>Cancel</Modal.Close>
        <Modal.Submit formId={formId}>Save</Modal.Submit>
      </Modal.Actions>
    </Modal>
  );
}

/**
 * The style routes' clientAction: saving is online-only, so offline (or when
 * the request fails) the dialog stays open with a toast rather than queueing.
 */
export async function saveStyleOnline<T>(serverAction: () => Promise<T>): Promise<T | null> {
  if (navigator.onLine) {
    try {
      return await withStaleVersionRetry(serverAction);
    } catch (error) {
      if (!isNetworkOrServerError(error)) throw error;
    }
  }
  toast.error("You're offline - connect to change the style");
  return null;
}
