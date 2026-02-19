import { useNavigate } from "react-router";
import { type ReactNode } from "react";
import * as styles from "./modal.css";

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

export function ModalActions({ children }: { children: ReactNode }) {
  return (
    <form method="dialog" className={styles.closeForm}>
      <button className={styles.close} aria-label="Close">
        ×
      </button>

      {children}
    </form>
  );
}
