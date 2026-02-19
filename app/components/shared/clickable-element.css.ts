import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const destructive = style({
  color: "red",
});

export const clickable = style({
  appearance: "none",
  border: "2px solid currentColor",
  paddingInline: vars.spacing.md,
  textDecoration: "none",
  minWidth: 0,
  width: "max-content",
  height: vars.spacing.controlHeight,
  borderRadius: vars.spacing.controlRadius,
  background: "none",
  display: "inline-flex",
  alignItems: "center",
  ":hover": {
    opacity: 0.8,
  },
});
