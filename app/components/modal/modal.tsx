import { useNavigate, useNavigation } from "react-router";
import { type ReactNode } from "react";
import * as styles from "./modal.css";
import { Button } from "../button/button";

// Must be used as a sibling to React Router's <Form>, never nested inside it.
// The native <form method="dialog"> is not intercepted by React Router.
function ModalActions({ children }: { children: ReactNode }) {
  return <form method="dialog">{children}</form>;
}

function ModalClose({ children }: { children: ReactNode }) {
  return <Button type="submit">{children}</Button>;
}

function ModalSubmit({ children }: { children: ReactNode }) {
  const { state } = useNavigation();

  return (
    <Button type="submit" isSubmitting={state === "submitting"}>
      {children}
    </Button>
  );
}

export function Modal({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <dialog
      ref={(node) => node?.showModal()}
      className={styles.dialog}
      onClose={() => navigate(-1)}
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
