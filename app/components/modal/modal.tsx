import { useNavigate } from "react-router";
import { type ReactNode } from "react";
import * as styles from "./modal.css";

export function Modal({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  function dismiss() {
    navigate(-1);
  }

  return (
    <dialog
      ref={(node) => node?.showModal()}
      className={styles.dialog}
      onCancel={dismiss}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className={styles.content}>{children}</div>
    </dialog>
  );
}
