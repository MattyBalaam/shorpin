import { style } from "@vanilla-extract/css";
import { vars } from "./styles/theme.css";

export const main = style({
  margin: "0 auto",
  display: "grid",
  // `100%` follows the viewport, which `interactive-widget=resizes-content`
  // shrinks above the keyboard. The variable is a temporary iOS Safari
  // workaround set in root.tsx — see README "On-screen keyboard sizing".
  height: "var(--visual-viewport-height, 100%)",
  overflow: "hidden",
  // `viewport-fit=cover` lets the page run under the status bar / notch, where
  // iOS blurs whatever sits beneath it — keep content below the inset.
  paddingBlockStart: `max(env(safe-area-inset-top), ${vars.spacing.md})`,
  gridTemplateRows: "[breadcrumbs] auto [content] minmax(0, 1fr) [actions] auto",
  gridTemplateColumns:
    "[left] minmax(20px, 1fr) [content] minmax(0, 60ch) [right] minmax(20px, 1fr)",
});

export const loading = style({
  display: "grid",
  placeItems: "center",
  background: vars.palette.secondary,
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
});
