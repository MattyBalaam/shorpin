import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const devSection = style({
  marginBlockStart: vars.spacing.xxl,
  paddingBlockStart: vars.spacing.lg,
  borderBlockStart: `1px dashed ${vars.palette.chromeLight}`,
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.sm,
});

export const devHeading = style({
  fontSize: vars.fontSize.xs,
  color: vars.palette.chrome,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  margin: 0,
});

export const devButton = style({
  display: "flex",
  alignItems: "baseline",
  gap: vars.spacing.sm,
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  background: vars.palette.chromeLight,
  border: "none",
  borderRadius: vars.spacing.controlRadius,
  cursor: "pointer",
  width: "100%",
  textAlign: "left",
  fontSize: vars.fontSize.sm,
});

export const devEmail = style({
  color: vars.palette.chrome,
  fontSize: vars.fontSize.xs,
});
