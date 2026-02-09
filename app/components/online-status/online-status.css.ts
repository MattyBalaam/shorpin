import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const indicator = style({
  position: "fixed",
  top: vars.spacing.sm,
  right: vars.spacing.sm,
  padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
  backgroundColor: vars.palette.secondary,
  color: vars.palette.text,
  borderRadius: vars.spacing.xs,
  fontSize: "0.875rem",
  fontWeight: 500,
  zIndex: 1000,
});
