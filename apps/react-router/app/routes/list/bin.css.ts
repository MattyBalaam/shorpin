import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const items = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: vars.spacing.sm,
});

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.md,
});

export const value = style({
  flex: 1,
  minWidth: 0,
  overflowWrap: "anywhere",
});

export const tag = style({
  marginInlineStart: vars.spacing.sm,
  color: vars.palette.chrome,
  fontSize: vars.fontSize.sm,
});
