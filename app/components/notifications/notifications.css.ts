import { createVar, keyframes, style, styleVariants } from "@vanilla-extract/css";
import { AUTO_DISMISS_MS } from "~/lib/toast";
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

// Registered so the angle animates; a plain custom property would jump.
const timeLeft = createVar({ syntax: "<angle>", inherits: false, initialValue: "360deg" });

const countDown = keyframes({
  to: { vars: { [timeLeft]: "0deg" } },
});

// A pie that empties as the auto-dismiss time runs out. Its delay is set
// from the store's time left on mount (see DismissClock), and it pauses
// while the panel holds the timer.
export const clock = style({
  flexShrink: 0,
  inlineSize: "1em",
  blockSize: "1em",
  borderRadius: "50%",
  border: "1.5px solid currentColor",
  background: `conic-gradient(currentColor ${timeLeft}, transparent 0)`,
  animation: `${countDown} ${AUTO_DISMISS_MS}ms linear forwards`,

  selectors: {
    [`${panel}[data-held] &`]: {
      animationPlayState: "paused",
    },
  },
});

export const buttons = style({
  display: "flex",
  gap: vars.spacing.sm,
});
