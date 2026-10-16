import { fallbackVar, style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const actionsWrapper = style({
  display: "grid",
  gridRow: "actions",
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  paddingBlockStart: vars.spacing.md,
  paddingBlockEnd: `max(env(safe-area-inset-bottom), ${vars.spacing.md})`,
  background: fallbackVar(vars.style.barBackground, vars.palette.primary),
  backgroundImage: vars.style.sheen,
  borderBlockStart: vars.style.barBorder,
});
