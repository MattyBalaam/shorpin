import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const clickable = style({
  appearance: "none",
  border: "none",
  paddingInline: vars.spacing.md,
  textDecoration: "none",
  outline: "2px solid currentColor",
  minWidth: 0,
  width: "max-content",
  height: vars.spacing.baseline,
  borderRadius: "3px",
  background: "none",
  display: "inline-flex",
  alignItems: "center",
  ":hover": {
    opacity: 0.8,
  },
});
