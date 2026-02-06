import { style } from "@vanilla-extract/css";
import { vars } from "~/theme.css";

export const form = style({
  display: "grid",
  gridRow: "content / -1",
  gridTemplateRows: "subgrid",
  overflow: "hidden",
});

export const items = style({
  gridRow: "content",
  paddingInline: vars.spacing.appMargin,
  overflow: "hidden",
  display: "grid",
  maskImage: `linear-gradient(to bottom,
    transparent,
    black 1.5rem,
    black calc(100% - 1.5rem),
    transparent
  )`,
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
