import React from "react";
import { animated, useSpring } from "react-spring";
import styles from "./InfoModal.module.css";

interface Props {
  message: string | null;
  type?: string;
}

export default ({ message, type }: Props) => {
  if (!message) {
    return null;
  }
  const props = useSpring({ opacity: 1, from: { opacity: 0 } });
  return (
    <div className={styles.wrapper}>
      <animated.aside className={styles.message} style={props}>
        {type && <strong>{type}: </strong>}
        {message}
      </animated.aside>
    </div>
  );
};
