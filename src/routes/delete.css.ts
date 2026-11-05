import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const form = style({
  gridRow: "content",
  gridColumn: "content",
  display: "grid",
  gap: vars.spacing.md,
  alignContent: "start",
});

export const actions = style({
  display: "flex",
  gap: vars.spacing.lg,
});
