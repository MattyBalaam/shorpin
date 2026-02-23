import { useNavigate, useNavigation } from "react-router";
import { type ReactNode } from "react";
import * as styles from "./modal.css";
import { Button } from "../button/button";

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

function ModalClose({ children }: { children: ReactNode }) {
  return <Button type="submit">{children}</Button>;
}

function ModalSubmit({ children, formId }: { children: ReactNode; formId: string }) {
  const { state } = useNavigation();

  return (
    <Button type="submit" form={formId} isSubmitting={state === "submitting"}>
      {children}
    </Button>
  );
}

export function Modal({ children, urlOnClose }: { children: ReactNode; urlOnClose: string }) {
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

Modal.Actions = ModalActions;
Modal.Close = ModalClose;
Modal.Submit = ModalSubmit;
