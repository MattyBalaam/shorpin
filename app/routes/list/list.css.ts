import { fallbackVar, style } from "@vanilla-extract/css";
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

export const undoIcon = style({
  display: "block",
  width: "18px",
  height: "18px",
});

export const actions = style({
  gridColumn: "content",
  display: "flex",
  flexWrap: "wrap",
  gap: "1em",
  minWidth: 0,
});

// Inline, borderless "add item" input — the distinctive list treatment.
export const addInput = style({
  flex: 1,
  // Inputs have an intrinsic width from their default `size`; let it shrink.
  minWidth: 0,
  paddingBlock: vars.spacing.sm,
  paddingInline: vars.spacing.md,
  fontSize: vars.fontSize.md,
  fontFamily: "inherit",
  border: fallbackVar(vars.style.inputBorder, "none"),
  background: "white",
  color: "black",
});

// Matches the taller list input; the look comes from Button's solid variant.
export const addTag = style({
  flex: "0 1 8rem",
  minWidth: 0,
});

// Styled with addInput, to match the item input beside it. addInput's
// `flex: 1` widens the item input across the bar, but in the combobox's
// column (label above input) it would grow the input's height instead.
export const addTagInput = style({
  flex: "none",
  width: "100%",
});

export const addButton = style({
  height: "auto",
});
