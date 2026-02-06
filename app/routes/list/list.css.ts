import { style } from "@vanilla-extract/css";
import { vars } from "~/theme.css";

export const form = style({
  display: "grid",
  gridTemplateRows: "[items] 1fr [actions] auto",
  height: "100lvh",
  overflow: "hidden",
});

export const items = style({
  gridRow: "items",
  paddingInline: vars.spacing.appMargin,
  position: "relative",
  overflow: "hidden",
  display: "grid",
  ":after": {
    content: "",
    height: "1rem",
    position: "absolute",
    insetInline: "0",
    bottom: 0,
    backgroundImage:
      "linear-gradient(0deg, rgb(255,255,255,1) 25%, rgb(255,255,255,0) 100%)",
  },
  ":before": {
    content: "",
    height: "1rem",
    position: "absolute",
    insetInline: "0",
    top: 0,
    backgroundImage:
      "linear-gradient(180deg, rgb(255,255,255,1) 25%, rgb(255,255,255,0) 100%)",
  },
});

export const itemsScroll = style({
  paddingBlock: "1rem",
  display: "grid",
  gridTemplateColumns: "[input] 1fr [drag] auto [done] auto",
  alignItems: "start",
  overflow: "auto",
});

export const hiddenSubmit = style({
  display: "none",
});

export const submitButton = style({
  // gridColumn: "1",
  // marginTop: "2em",
  // alignSelf: "start",
  // minWidth: 0,
});

export const undoButton = style({
  appearance: "none",
  gridColumnStart: "input",
  gridColumnEnd: "done",
});

export const actions = style({
  gridRow: "actions",
  display: "grid",
  padding: vars.spacing.appMargin,
  gap: "1em",
  // gridTemplateColumns: "max-content max-content",
  background: vars.palette.primary,
});

export const deleteLink = style({
  color: "red",
});
