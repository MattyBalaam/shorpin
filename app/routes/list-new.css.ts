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

export const undoButton = style({
  gridColumnStart: "input",
  gridColumnEnd: "done",
  marginLeft: "auto",
});

export const actions = style({
  gridColumn: "content",
  display: "flex",
  gap: "1em",
});

// Inline, borderless "add item" input — the distinctive list-new treatment.
export const addInput = style({
  flex: 1,
  paddingBlock: vars.spacing.sm,
  paddingInline: vars.spacing.md,
  fontSize: vars.fontSize.md,
  fontFamily: "inherit",
  border: "none",
  outline: "none",
  background: "transparent",
});

// Pill "Add" button. Layered over Button's primary variant (which loads first),
// so these visual overrides win — same pattern as item.css `tick`.
export const addButton = style({
  background: vars.palette.text,
  color: "white",
  borderRadius: vars.radius.pill,
  paddingInline: vars.spacing.lg,
  fontSize: vars.fontSize.md,
  fontWeight: vars.fontWeight.semibold,
});

export const topActions = style({
  gridRow: "breadcrumbs",
  gridColumn: "content",
  justifySelf: "end",
  display: "flex",
  gap: vars.spacing.sm,
});

export const errorState = style({
  gridColumn: "content",
  gridRow: "content / -1",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.spacing.lg,
  textAlign: "center",
  paddingInline: vars.spacing.appMargin,
});
