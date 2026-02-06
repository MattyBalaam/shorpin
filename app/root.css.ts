import { globalStyle, style } from "@vanilla-extract/css";

export const main = style({
  margin: "0 auto",
  display: "grid",
  // maxWidth: "60ch", // move to content
  width: "100%",
  height: "100lvh",
  gridTemplateRows: "[breadcrumbs] auto  [content] 1fr [actions] auto",
});

globalStyle("body, h1", {
  margin: 0,
});
