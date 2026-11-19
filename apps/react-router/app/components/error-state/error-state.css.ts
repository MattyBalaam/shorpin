import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const errorState = style({
  gridColumn: "content",
  gridRow: "content / -1",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.spacing.lg,
  textAlign: "center",
  paddingInline: vars.spacing.appMargin,
});
