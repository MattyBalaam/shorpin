import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const combobox = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.sm,
});

export const input = style({
  padding: vars.spacing.md,
  border: `1px solid ${vars.palette.chrome}`,
  borderRadius: vars.style.controlRadius,
});

// A popover: undo its centred UA placement and anchor it under the input
// (anchor names are per instance, set inline), flipping above when there's
// no room below.
//
// The flip measures the layout viewport, which iOS Safari doesn't shrink for
// the keyboard, so on an iPhone the space behind the keyboard counts as room
// and the list opens under it. Controls pinned to the bottom of the screen
// use `listboxAbove` instead.
export const listbox = style({
  positionArea: "block-end span-inline-end",
  positionTryFallbacks: "flip-block",
  inset: "auto",
  width: "anchor-size(width)",
  maxHeight: "12rem",
  overflowY: "auto",
  margin: 0,
  marginBlock: vars.spacing.xs,
  padding: vars.spacing.xs,
  listStyle: "none",
  border: `1px solid ${vars.palette.chrome}`,
  borderRadius: vars.style.controlRadius,
  boxShadow: vars.style.surfaceShadow,
  background: "Canvas",
  color: "CanvasText",
});

// Opens above the input, for controls at the bottom of the screen (e.g. the
// add bar sitting on the keyboard).
export const listboxAbove = style({
  positionArea: "block-start span-inline-end",
});

// Compact rows, close to the control height of the inputs they serve.
export const option = style({
  paddingBlock: vars.spacing.xs,
  paddingInline: vars.spacing.sm,
  lineHeight: 1.35,
  borderRadius: vars.style.controlRadius,
  cursor: "pointer",
  selectors: {
    "&:hover": {
      background: "rgb(0 0 0 / 0.08)",
    },
    // The tag the field holds now, ticked like a select's chosen option.
    '&[data-current="true"]::after': {
      content: '"✓"',
      float: "inline-end",
    },
    '&[aria-selected="true"]': {
      background: vars.palette.primary,
      color: vars.palette.textOnPalette,
    },
  },
});
