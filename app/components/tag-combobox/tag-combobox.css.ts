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
// no room below (e.g. over the keyboard, or from the add bar).
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
