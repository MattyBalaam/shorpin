import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const list = style({
  // display: "grid",
  // gridTemplateColumns: "1fr",
  gap: "1px",
  // listStyle: "none",
  // margin: 0,
  // padding: 0,
  // width: `min(60ch, calc(100% - (2 * ${vars.spacing.appMargin})))`,
  // marginInline: "auto",
  display: "grid",
  gridTemplateColumns: "subgrid",
  gridColumn: "1 / -1",
  width: "100%",
  padding: 0,
  alignContent: "start",
});

export const actions = style({
  display: "flex",
  gap: vars.spacing.md,
  width: `min(60ch, calc(100% - (2 * ${vars.spacing.appMargin})))`,
  marginInline: "auto",
});

export const addInput = style({
  flex: 1,
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  fontSize: vars.fontSize.md,
  fontFamily: "inherit",
  border: "none",
  outline: "none",
  backgroundColor: "transparent",
});

export const addButton = style({
  padding: `${vars.spacing.sm} ${vars.spacing.lg}`,
  fontSize: vars.fontSize.md,
  fontWeight: vars.fontWeight.semibold,
  fontFamily: "inherit",
  border: "none",
  backgroundColor: vars.palette.text,
  color: "white",
  borderRadius: vars.radius.pill,
  cursor: "pointer",
  selectors: {
    "&:hover": {
      opacity: 0.9,
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.palette.text}`,
      outlineOffset: "2px",
    },
  },
});
