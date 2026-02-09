import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const form = style({
  display: "grid",
  gridColumn: "1 / -1",
  gridRow: "content / -1",
  gridTemplateRows: "subgrid",
  gridTemplateColumns: "subgrid",
  overflow: "hidden",
});

export const items = style({
  gridColumn: "1 / -1",
  gridRow: "content",
  overflow: "hidden",
  display: "grid",
  gridTemplateColumns: "subgrid",
  maskImage: `linear-gradient(to bottom,
    transparent,
    black 1.5rem,
    black calc(100% - 1.5rem),
    transparent
  )`,
});

export const itemsScroll = style({
  gridColumn: "1 / -1",
  paddingBlock: "1rem",
  display: "grid",
  gridTemplateColumns: "subgrid",
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
  gridColumnStart: "input",
  gridColumnEnd: "done",
  marginLeft: "auto",
});

export const actions = style({
  gridColumn: "content",
  display: "flex",
  // justifyContent: "space-",
  gap: "1em",
});

export const topActions = style({
  gridRow: "breadcrumbs",
  gridColumn: "content",
  justifySelf: "end",
  display: "flex",
  gap: vars.spacing.sm,
});

export const deleteLink = style({
  color: "red",
});
