import { styleVariants } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

const buttonBase = {
  appearance: "none",
  paddingInline: vars.spacing.md,
  textDecoration: "none",
  minWidth: 0,
  width: "max-content",
  height: vars.spacing.controlHeight,
  borderRadius: vars.spacing.controlRadius,
  background: "none",
  display: "inline-flex",
  alignItems: "center",
  ":focus": {
    background: "yellow",
    outline: "none",
    color: "black",
    borderColor: "yellow",
  },
  ":hover": {
    opacity: 0.8,
  },
} as const;

export const variant = styleVariants({
  outline: {
    ...buttonBase,
    border: "2px solid currentColor",
  },
  destructive: {
    color: "red",
    ...buttonBase,
  },
  link: {
    borderRadius: vars.spacing.controlRadius,
    ":focus": {
      outline: "2px solid yellow",
      outlineOffset: vars.spacing.sm,
    },
  },
});
