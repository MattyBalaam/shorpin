import React, { useState, useCallback } from "react";
import { animated, useTransition } from "react-spring";
import styles from "./Undo.module.css";

interface Props {
  undo: string | null | false;
  onUndo: () => void;
}

export default ({ undo, onUndo }: Props) => {
  const transitions = useTransition(!!undo, null, {
    from: { opacity: 0, transform: "translateY(5em)" },
    enter: { opacity: 1, transform: "translateY(0em)" },
    leave: { opacity: 0, transform: "translateY(5em)" }
  });

  return (
    <>
      {transitions.map(
        ({ item, key, props }) =>
          item && (
            <animated.aside
              key={key}
              className={`${styles.undo}`}
              style={props}
            >
              <button className={styles.undoButton} onClick={onUndo}>
                Undo for: {undo}
              </button>
            </animated.aside>
          )
      )}
    </>
  );
};
