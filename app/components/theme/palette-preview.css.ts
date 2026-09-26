import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const grid = style({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: vars.spacing.md,
});

export const pane = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.sm,
  padding: vars.spacing.md,
  borderRadius: vars.spacing.controlRadius,
});

export const paneLabel = style({
  margin: 0,
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.semibold,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.sm,
  padding: vars.spacing.sm,
  borderRadius: vars.spacing.controlRadius,
});

export const line = style({
  display: "inline-block",
  height: "0.6em",
  width: "45%",
  borderRadius: vars.radius.pill,
  opacity: 0.7,
});

export const badge = style({
  marginInlineStart: "auto",
  fontSize: vars.fontSize.xs,
  padding: `2px ${vars.spacing.xs}`,
  borderRadius: vars.radius.pill,
});

export const button = style({
  alignSelf: "flex-start",
  border: "none",
  borderRadius: vars.spacing.controlRadius,
  height: vars.spacing.controlHeight,
  paddingInline: vars.spacing.md,
  fontSize: vars.fontSize.sm,
  fontWeight: vars.fontWeight.medium,
});
