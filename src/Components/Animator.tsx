import React, { useState, ReactNode } from "react";
import { Transition, config } from "react-spring";

interface Item {
  id: string;
  name: string;
}
interface Props {
  items: Item[];
  itemRender: (props: any) => ReactNode;
}

export default function Animator({ items, itemRender }: Props) {
  const [animationComplete, setComplete] = useState([] as any);

  const handleStart = ({ id }: Item) => {
    setComplete(animationComplete.filter((compID: string) => id !== compID));
  };

  const handleRest = ({ id }: Item) => {
    if (!items.find(({ id: iid }) => id === iid)) return;
    setComplete([...animationComplete, id]);
  };

  const animItems = items.map(item => {
    const finished = !!animationComplete.find((id: string) => id === item.id);

    return {
      ...item,
      finished
    };
  });

  return (
    <Transition
      config={config.wobbly}
      items={animItems}
      keys={(item: any) => item.id}
      onStart={handleStart as any}
      onRest={handleRest as any}
      trail={100}
      from={{
        opacity: 0,
        height: "0em"
      }}
      enter={{
        opacity: 1,
        height: "4em"
      }}
      leave={{
        opacity: 0,
        height: "0em"
      }}
    >
      {(item, state) => props => itemRender({ props, item, state })}
    </Transition>
  );
}
