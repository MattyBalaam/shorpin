import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const dialog = style({
  padding: 0,
  border: "none",
  borderRadius: vars.spacing.sm,
  margin: "auto",
  maxWidth: "32rem",
  width: `calc(100% - ${vars.spacing.xxl})`,
  "::backdrop": {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
});

export const content = style({
  padding: vars.spacing.xl,
  display: "flex",
  flexDirection: "column",
  gap: vars.spacing.lg,
});

export const actions = style({
  display: "flex",
  justifyContent: "end",
  gap: vars.spacing.lg,
});
