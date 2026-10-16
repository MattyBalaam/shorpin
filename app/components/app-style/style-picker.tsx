import { useId, useRef, useState } from "react";
import { APP_STYLE_ATTRIBUTE, appStyles, type AppStyle } from "~/lib/app-style";
import * as clickableStyles from "~/components/shared/clickable-element.css";
import { Button } from "../button/button";
import * as modalStyles from "../modal/modal.css";
import * as styles from "./style-picker.css";

const styleNames = Object.keys(appStyles) as AppStyle[];

// Radio value for "no override" when the picker offers one.
const INHERIT = "inherit";

type Choice = AppStyle | null;

interface StylePickerProps {
  title: string;
  value: Choice;
  onSave: (style: Choice) => void;
  /**
   * Offers a "My style" option that saves as null (no override), previewed
   * in this style — the viewer's own. Without it, null is never produced.
   */
  inherit?: AppStyle;
}

type Option = { value: string; style: AppStyle; label: string; description: string };

// Nothing changes until Save: picking an option only moves the selection, and
// each option previews itself in miniature. Cancel, Escape or a click on the
// backdrop discard the choice. Not a <form>: it's rendered next to forms it
// must not nest inside or submit fields with.
export function StylePicker({ title, value, onSave, inherit }: StylePickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [choice, setChoice] = useState<Choice>(value);

  const options: Option[] = [
    ...(inherit
      ? [
          {
            value: INHERIT,
            style: inherit,
            label: "My style",
            description: `Follow your own style (${appStyles[inherit].label})`,
          },
        ]
      : []),
    ...styleNames.map((name) => ({ value: name, style: name, ...appStyles[name] })),
  ];

  function open() {
    setChoice(value);
    dialogRef.current?.showModal();
  }

  function save() {
    onSave(choice);
    dialogRef.current?.close();
  }

  return (
    <>
      <Button variant="outline" onClick={open}>
        Style
      </Button>
      <dialog
        ref={dialogRef}
        className={modalStyles.dialog}
        aria-labelledby={headingId}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className={modalStyles.content}>
          <h2 id={headingId}>{title}</h2>
          <div className={modalStyles.body}>
            <div role="radiogroup" aria-labelledby={headingId} className={styles.options}>
              {options.map((option) => (
                <label
                  key={option.value}
                  className={styles.option}
                  {...{ [APP_STYLE_ATTRIBUTE]: option.style }}
                >
                  <input
                    type="radio"
                    name="app-style"
                    value={option.value}
                    checked={(choice ?? INHERIT) === option.value}
                    onChange={() => setChoice(option.value === INHERIT ? null : option.style)}
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
          </div>
          <div className={modalStyles.actions}>
            <Button variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
