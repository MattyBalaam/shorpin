import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const layout = style({
  gridColumn: "content",
  gridRow: "content",
  display: "grid",
  alignContent: "start",
  gap: vars.spacing.baseline,
});
