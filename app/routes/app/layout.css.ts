import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const logOut = style({
  gridRow: "breadcrumbs",
  gridColumn: "content",
  justifySelf: "end",
  containerType: "inline-size",
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  // TODO let’s work out a nicer way for this
  minWidth: `calc(${vars.spacing.controlHeight} * 1.5)`,
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
