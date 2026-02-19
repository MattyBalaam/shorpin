import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const logOut = style({
  gridRow: "breadcrumbs",
  gridColumn: "right",
  containerType: "inline-size",
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  paddingInlineEnd: vars.spacing.md,
  minWidth: vars.spacing.controlHeight,
});

export const logOutLabel = style({
  display: "none",
  "@container": {
    "(min-width: 100px)": {
      display: "inline",
    },
  },
});

export const logOutIcon = style({
  "@container": {
    "(min-width: 100px)": {
      display: "none",
    },
  },
});
