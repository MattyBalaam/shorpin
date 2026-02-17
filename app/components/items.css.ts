import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const wrapper = style({
  display: "grid",
  gridTemplateColumns: "subgrid",
  gridColumn: "1 / -1",
  cursor: "grab",
  marginBlockEnd: 0,
  color: vars.palette.textOnChrome,

  "@media": {
    "(prefers-color-scheme: dark)": {
      color: vars.palette.textOnChromeDarkMode,
    },
  },
  ":active": {
    cursor: "grabbing",
  },
});

export const items = style({
  display: "grid",
  gridTemplateColumns: "subgrid",
  gridColumn: "1 / -1",
  padding: 0,
  alignContent: "start",
});
