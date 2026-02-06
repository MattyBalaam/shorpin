import { style } from "@vanilla-extract/css";
import { vars } from "~/theme.css";

export const list = style({
  listStyle: "none",
  padding: 0,
  selectors: {},
});

export const item = style({
  display: "flex",
  justifyContent: "space-between",
  paddingInline: vars.spacing.baseline,
  paddingBlock: vars.spacing.md,
  background: vars.palette.chrome,
  margin: 0,
  borderBottom: `1px solid ${vars.palette.chromeLight}`,
  color: vars.palette.textOnChrome,
});

export const newList = style({
  display: "flex",
  // justifyContent: "space-between",
  gap: vars.spacing.baseline,
});
