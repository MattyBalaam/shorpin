import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

// Collapsed to nothing until there's a notification, then grows to fit it.
// Animating grid-template-rows (0fr ↔ 1fr) gives a height transition to the
// content's own size, which `height: auto` can't do everywhere yet.
export const panel = style({
  gridRow: "notifications",
  gridColumn: "content",
  display: "grid",
  gridTemplateRows: "0fr",

  selectors: {
    "&[data-open]": {
      gridTemplateRows: "1fr",
    },
  },

  "@media": {
    "(prefers-reduced-motion: no-preference)": {
      transition: "grid-template-rows 200ms ease-out",
    },
  },
});

// The grid item that shrinks to zero; spacing lives on its child, since
// padding here would stop it collapsing fully.
export const clip = style({
  minHeight: 0,
  overflow: "hidden",
});

const notification = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: vars.spacing.sm,
  marginBlock: vars.spacing.sm,
  padding: vars.spacing.sm,
  paddingInlineStart: vars.spacing.md,
  borderRadius: vars.style.controlRadius,
  background: vars.palette.secondary,
  color: vars.palette.textOnPalette,
});

export const type = styleVariants({
  success: [notification],
  info: [notification],
  warning: [notification, { boxShadow: `inset 4px 0 ${vars.palette.error}` }],
  error: [notification, { boxShadow: `inset 4px 0 ${vars.palette.error}` }],
});

export const message = style({
  flex: "1 1 12rem",
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.sm,
});

export const count = style({
  flexShrink: 0,
  minWidth: "1.5em",
  paddingInline: vars.spacing.xs,
  borderRadius: "1em",
  background: vars.palette.text,
  color: "white",
  fontSize: vars.fontSize.sm,
  fontWeight: vars.fontWeight.bold,
  textAlign: "center",
});

export const buttons = style({
  display: "flex",
  gap: vars.spacing.sm,
});
