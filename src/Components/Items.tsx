import React from "react";
import Animator from "./Animator";
//@ts-ignore
import Item from "./Item";
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
          <Item props={props} item={item} state={state} onRemove={onRemove} />
        )}
      />
    </ul>
  </article>
);
