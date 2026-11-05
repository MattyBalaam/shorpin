import { useNavigate, useNavigation } from "react-router";
import { type ReactNode } from "react";
import * as styles from "./modal.css";
import { Button } from "../button/button";
import { SUBMIT_ACTION, useIsSubmitting } from "../button/use-is-submitting";

// Must be used as a sibling to React Router's <Form>, never nested inside it.
// The native <form method="dialog"> is not intercepted by React Router.
// Use Modal.Submit with a form="<id>" prop to associate it with the RR Form by id.
function ModalActions({ children }: { children: ReactNode }) {
  return (
    <form method="dialog" className={styles.actions}>
      {children}
    </form>
  );
}

// Scrolls when the content outgrows the dialog; the heading before it and
// Modal.Actions after it stay in view.
function ModalBody({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>;
}

function ModalClose({ children }: { children: ReactNode }) {
  return (
    <Button variant="outline" type="submit">
      {children}
    </Button>
  );
}

function ModalSubmit({ children, formId }: { children: ReactNode; formId: string }) {
  const isSubmitting = useIsSubmitting(formId);

  return (
    <Button
      type="submit"
      form={formId}
      name={SUBMIT_ACTION}
      value={formId}
      isSubmitting={isSubmitting}
    >
      {children}
    </Button>
  );
}

export function Modal({
  children,
  urlOnClose,
  labelledBy,
}: {
  children: ReactNode;
  urlOnClose: string;
  /** Id of the element (usually the heading) that names the dialog. */
  labelledBy?: string;
}) {
  const navigate = useNavigate();
  const navigation = useNavigation();

  function dismiss() {
    navigate(urlOnClose);
  }

  return (
    <dialog
      ref={(node) => {
        if (navigation.state === "idle") {
          node?.showModal();
        }
      }}
      className={styles.dialog}
      aria-labelledby={labelledBy}
      onClose={dismiss}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          (e.currentTarget as HTMLDialogElement).close();
        }
      }}
    >
      <div className={styles.content}>{children}</div>
    </dialog>
  );
}

Modal.Body = ModalBody;
Modal.Actions = ModalActions;
Modal.Close = ModalClose;
Modal.Submit = ModalSubmit;
