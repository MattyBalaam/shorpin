import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const actionsWrapper = style({
  display: "grid",
  gridRow: "actions",
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  paddingBlockStart: vars.spacing.md,
  paddingBlockEnd: `max(env(safe-area-inset-bottom), ${vars.spacing.md})`,
  background: vars.palette.primary,
});
