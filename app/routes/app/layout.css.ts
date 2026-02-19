import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const logOut = style({
  gridRow: "breadcrumbs",
  gridColumn: "right",
  marginInlineStart: "auto",
  marginRight: vars.spacing.md,
});

export const logOutLabel = style({
  "@container": {
    "(max-width: 200px)": {
      display: "none",
    },
  },
});

export const logOutIcon = style({
  display: "none",
  "@container": {
    "(max-width: 200px)": {
      display: "inline",
    },
  },
});
