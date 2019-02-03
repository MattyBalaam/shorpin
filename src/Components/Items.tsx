import React from "react";
import Animator from "./Animator";
import styles from "./Items.module.css";

export interface ItemProps {
  id: string;
  name: string;
}

interface ItemsProps {
  items: ItemProps[];
  onRemove: (id: string) => void;
}

export default ({ items, onRemove }: ItemsProps) => (
  <article className={styles.listContainer}>
    <ul className={styles.items}>
      <Animator
        items={items}
        itemRender={({ props, item, state }) => (
          <li className={styles.item} style={props} key={item.id}>
            <button
              className={styles.button}
              type="button"
              onClick={() => onRemove(item.id)}
            >
              <div className={styles.buttonInner}>
                <span>{item.name}</span>
                <span
                  className={`${styles.tick} ${
                    item.finished && state !== "leave" ? styles.showTick : ""
                  }`}
                >
                  ✔
                </span>
              </div>
            </button>
          </li>
        )}
      />
    </ul>
  </article>
);
