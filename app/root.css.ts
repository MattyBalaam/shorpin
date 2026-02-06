import { globalStyle, style } from "@vanilla-extract/css";

export const main = style({
  margin: "0 auto",
  maxWidth: "60ch",
  width: "100%",
  padding: "0",
  boxSizing: "border-box",
});

globalStyle("body, h1", {
  margin: 0,
});
