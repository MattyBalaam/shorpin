import { useNavigate } from "@tanstack/solid-router";
import { type Element, onSettled } from "solid-js";
import * as styles from "./modal.css";
import { Button } from "../button/button";

// A dialog route's frame. Its content form sits in Modal.Body, and
// Modal.Submit submits it from Modal.Actions by id (`form="<id>"`): the
// actions are a native <form method="dialog">, which closes the dialog
// without a request, so the content form can't be nested inside it.
function ModalActions(props: { children?: Element }) {
  return (
    <form method="dialog" class={styles.actions}>
      {props.children}
    </form>
  );
}

// Scrolls when the content outgrows the dialog; the heading before it and
// Modal.Actions after it stay in view.
function ModalBody(props: { children?: Element }) {
  return <div class={styles.body}>{props.children}</div>;
}

function ModalClose(props: { children?: Element }) {
  return (
    <Button variant="outline" type="submit">
      {props.children}
    </Button>
  );
}

function ModalSubmit(props: { children?: Element; formId: string; isSubmitting?: boolean }) {
  return (
    <Button type="submit" form={props.formId} isSubmitting={props.isSubmitting}>
      {props.children}
    </Button>
  );
}

export function Modal(props: {
  children?: Element;
  /** Where Close, Escape or a backdrop click go: the page behind. */
  urlOnClose: string;
  /** Id of the element (usually the heading) that names the dialog. */
  labelledBy?: string;
}) {
  const navigate = useNavigate();
  let dialog!: HTMLDialogElement;

  // Opened once it's in the document: showModal() needs a connected
  // element, and the server can't render the modal state (an `open`
  // attribute would show it, but not as modal).
  onSettled(() => {
    dialog.showModal();
  });

  return (
    <dialog
      ref={dialog}
      class={styles.dialog}
      aria-labelledby={props.labelledBy}
      // Every way of closing (Close, Escape, the backdrop) ends here. A save
      // navigates away itself, unmounting the dialog without a close event.
      onClose={() => void navigate({ href: props.urlOnClose })}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.close();
      }}
    >
      <div class={styles.content}>{props.children}</div>
    </dialog>
  );
}

Modal.Body = ModalBody;
Modal.Actions = ModalActions;
Modal.Close = ModalClose;
Modal.Submit = ModalSubmit;
