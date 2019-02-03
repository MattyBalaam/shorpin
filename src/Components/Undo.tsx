import React from "react";
import { Transition } from "react-spring";
import styles from "./Undo.module.css";

interface Props {
  undo: string | null;
  onUndo: () => void;
}

export default ({ undo, onUndo }: Props) => (
  <Transition
    items={!!undo}
    from={{ opacity: 0, transform: "translateY(5em)" }}
    enter={{ opacity: 1, transform: "translateY(0em)" }}
    leave={{ opacity: 0, transform: "translateY(5em)" }}
  >
    {show =>
      show &&
      (props => (
        <aside className={`${styles.undo}`} style={props}>
          <button className={styles.undoButton} onClick={onUndo}>
            Undo for: {undo}
          </button>
        </aside>
      ))
    }
  </Transition>
);
