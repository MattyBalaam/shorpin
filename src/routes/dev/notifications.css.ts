import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const page = style({
  gridRow: "content",
  gridColumn: "content",
  display: "grid",
  gap: vars.spacing.md,
  alignContent: "start",
});

export const buttons = style({
  display: "flex",
  flexWrap: "wrap",
  gap: vars.spacing.sm,
});
