import { globalStyle, style } from "@vanilla-extract/css";

export const main = style({
  margin: "0 auto",
  display: "grid",
  // maxWidth: "60ch", // move to content
  width: "100%",
  height: "100lvh",
  gridTemplateRows: "[breadcrumbs] auto [content] 1fr [actions] auto",
  gridTemplateColumns:
    "[left] minmax(20px, auto) [content] minmax(auto, 60ch) [right] minmax(20px, auto)",
});

globalStyle("body, h1", {
  margin: 0,
});
