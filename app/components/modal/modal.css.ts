import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const dialog = style({
  padding: 0,
  border: vars.style.surfaceBorder,
  borderRadius: vars.style.surfaceRadius,
  boxShadow: vars.style.surfaceShadow,
  margin: "auto",
  maxWidth: "32rem",
  width: `calc(100% - ${vars.spacing.xxl})`,
  // Centre within the area above the on-screen keyboard. The variable is a
  // temporary iOS Safari workaround set in root.tsx (see README "On-screen
  // keyboard sizing"); elsewhere `100%` already follows the resized viewport.
  insetBlock: "0 calc(100% - var(--visual-viewport-height, 100%))",
  maxHeight: `calc(var(--visual-viewport-height, 100%) - ${vars.spacing.xxl})`,
  // The dialog itself never scrolls: `body` does, between a fixed heading and
  // actions. Only while open — display would otherwise override the hidden
  // state of a closed <dialog>.
  overflow: "hidden",
  selectors: {
    "&[open]": {
      display: "flex",
      flexDirection: "column",
    },
  },
  "::backdrop": {
    background: vars.style.backdrop,
  },
});

export const content = style({
  flex: "1 1 auto",
  minHeight: 0,
  padding: vars.spacing.xl,
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.lg,
});

// The scrollable part of a dialog: everything between the heading and the
// actions. Padded and pulled back out by the same amount so focus rings
// (up to Brutalist's 4px ring at a 3px offset) aren't clipped by the scroll.
export const body = style({
  flex: "1 1 auto",
  minHeight: 0,
  overflowY: "auto",
  overscrollBehavior: "contain",
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.lg,
  padding: vars.spacing.sm,
  margin: `calc(-1 * ${vars.spacing.sm})`,
});

export const actions = style({
  flexShrink: 0,
  display: "flex",
  justifyContent: "end",
  gap: vars.spacing.lg,
});
