"use client";
import {
  Button as RACButton,
  type ButtonProps,
  composeRenderProps,
} from "react-aria-components";
// import { ProgressCircle } from "./ProgressCircle";
import "./Button.css";

export function Button(
  props: ButtonProps & { ref?: React.Ref<HTMLButtonElement> },
) {
  return (
    <RACButton {...props}>
      {composeRenderProps(props.children, (children, { isPending }) => (
        <>{!isPending ? children : <span>Saving...</span>}</>
      ))}
    </RACButton>
  );
}
