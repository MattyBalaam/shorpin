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

export const hiddenSubmit = style({
  display: "none",
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
  color: vars.palette.error,
});
