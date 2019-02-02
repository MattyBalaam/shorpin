import React, { ReactNode } from "react";
import { Transition } from "react-spring";

interface Props {
  items: { id: string; name: string }[];
  itemRender: (props: any) => ReactNode;
}

export default function Animator({ items, itemRender }: Props) {
  return (
    <Transition
      items={items}
      keys={(item: any) => item.id}
      trail={100}
      from={{
        opacity: 0,
        height: "0em",
        paddingTop: "0em",
        paddingBottom: "0em"
      }}
      enter={{
        opacity: 1,
        height: "3em",
        paddingTop: "2em",
        paddingBottom: "2em"
      }}
      leave={{
        opacity: 0,
        height: "0em",
        paddingTop: "0em",
        paddingBottom: "0em"
      }}
    >
      {(item, state) => props => itemRender({ props, item, state })}
    </Transition>
  );
}
