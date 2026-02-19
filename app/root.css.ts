import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "./styles/theme.css";

export const main = style({
  margin: "0 auto",
  display: "grid",
  height: "100dvh",
  paddingBlockStart: vars.spacing.md,
  gridTemplateRows: "[breadcrumbs] auto [content] 1fr [actions] auto",
  gridTemplateColumns:
    "[left] minmax(20px, auto) [content] minmax(auto, 60ch) [right] minmax(20px, auto)",
});

globalStyle("body, h1", {
  margin: 0,
});
