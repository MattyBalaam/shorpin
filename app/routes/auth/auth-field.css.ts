import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const form = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.lg,
});

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.xs,
});

export const links = style({
  display: "flex",
  gap: vars.spacing.lg,
});
