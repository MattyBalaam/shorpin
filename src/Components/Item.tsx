import React, { CSSProperties } from "react";
import { animated, useSpring } from "react-spring";
import { useGesture } from "react-with-gesture";

import styles from "./Items.module.css";

export interface ItemProps {
  id: string;
  name: string;
  finished: boolean;
}

export interface ItemRenderProps {
  state: string;
  props: CSSProperties;
  onRemove: (id: string) => void;
  item: ItemProps;
}

type SpringyProps = () => {
  x: number;
  config: any;
};

export default ({ props, item, state, onRemove }: ItemRenderProps) => {
  const [{ xy }, set] = useSpring(() => ({ xy: [0, 0] }));

  const bind = useGesture(({ down, delta, velocity }) => {
    velocity = Math.max(velocity, 1);

    const config = {
      mass: velocity,
      tension: 500 * velocity,
      friction: 50
    };

    if (!down && delta[0] < -window.outerWidth * 0.5) {
      set({
        xy: [-window.outerWidth * 1.5, 0],
        config
      } as any);
      window.setTimeout(() => {
        onRemove(item.id);
      }, 300);
      return;
    }

    set({
      xy: down ? delta : [0, 0],
      config
    } as any);
  });

  return (
    <li className={styles.item} style={props}>
      <animated.div
        className={styles.button}
        {...bind()}
        style={{
          //@ts-ignore
          transform: xy.interpolate((x, y) => `translate3d(${x}px,${0}px,0)`)
        }}
      >
        <div className={styles.buttonInner}>
          <span>{item.name}</span>
          <button
            type="button"
            className={`${styles.tick} ${
              item.finished && state !== "leave" ? styles.showTick : ""
            }`}
            onClick={() => onRemove(item.id)}
          >
            ✔
          </button>
        </div>
      </animated.div>
    </li>
  );
};
