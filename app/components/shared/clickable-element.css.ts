import { createVar, fallbackVar, style, styleVariants } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

const { style: tokens } = vars;

// Each variant sets its own resting background and ink; the shared base
// (including its focus state) reads them, so a style whose focus state
// doesn't repaint controls (focusBackground/focusColor: initial) keeps them.
const background = createVar();
const ink = createVar();

const button = style({
  appearance: "none",
  paddingInline: vars.spacing.md,
  textDecoration: "none",
  minWidth: 0,
  width: "max-content",
  height: vars.spacing.controlHeight,
  borderRadius: tokens.controlRadius,
  background,
  backgroundImage: tokens.controlImage,
  color: ink,
  boxShadow: tokens.controlShadow,
  fontFamily: fallbackVar(tokens.controlFont, "revert"),
  fontWeight: tokens.controlWeight,
  textTransform: tokens.controlTransform,
  letterSpacing: tokens.controlTracking,
  display: "inline-flex",
  alignItems: "center",
  // Unless the app style sets one, buttons keep the browser's own border
  // and links keep none.
  border: fallbackVar(tokens.controlBorder, "revert"),
  ":focus": {
    background: fallbackVar(tokens.focusBackground, background),
    color: fallbackVar(tokens.focusColor, ink),
    outline: tokens.focusOutline,
    outlineOffset: tokens.focusOutlineOffset,
    boxShadow: tokens.focusShadow,
    borderColor: fallbackVar(tokens.focusBackground, "currentColor"),
  },
  ":hover": {
    opacity: 0.8,
  },
  ":active": {
    boxShadow: tokens.controlActiveShadow,
    translate: tokens.controlActiveTranslate,
  },
});

export const variant = styleVariants({
  primary: [
    button,
    {
      vars: {
        [background]: fallbackVar(tokens.controlBackground, vars.palette.primary),
        [ink]: fallbackVar(tokens.controlInk, vars.palette.textOnPalette),
      },
    },
  ],
  outline: [
    button,
    {
      // currentColor in `color` is the inherited colour.
      vars: { [background]: "none", [ink]: "currentColor" },
      border: "2px solid currentColor",
    },
  ],
  destructive: [button, { vars: { [background]: "none", [ink]: vars.palette.error } }],
  link: {
    borderRadius: tokens.controlRadius,
    ":focus": {
      outline: tokens.focusOutline,
      outlineOffset: vars.spacing.sm,
      boxShadow: tokens.focusShadow,
    },
  },
});
