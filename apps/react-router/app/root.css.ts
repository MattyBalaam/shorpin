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
  paddingBlockStart: `max(env(safe-area-inset-top), ${vars.spacing.barPadding})`,
  // The unnamed track under the header mirrors the padding above it, so the
  // header's controls don't sit on the content below.
  gridTemplateRows: `[breadcrumbs] auto ${vars.spacing.barPadding} [notifications] auto [content] minmax(0, 1fr) [actions] auto`,
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

// iOS 26+ blurs the top edge of home-screen apps over whatever the page
// paints there, header included. WebKit skips the blur when a fixed box with
// a background spans the top edge, and tints the status bar from it instead.
// Over 10px tall so WebKit reads the colour from style rather than sampling
// pixels. Must be a real element: pseudo-elements aren't sampled. See README
// "Top edge on iOS".
export const statusBarBackdrop = style({
  display: "none",

  "@media": {
    "(display-mode: standalone)": {
      "@supports": {
        "(-webkit-touch-callout: none)": {
          display: "block",
          position: "fixed",
          insetBlockStart: 0,
          insetInline: 0,
          zIndex: 1,
          blockSize: "max(env(safe-area-inset-top), 11px)",
          // Matches the page, which has no background of its own.
          background: "Canvas",
          pointerEvents: "none",
        },
      },
    },
  },
});

// Preview builds on the in-process mock (root loader's `mocksEnabled`), so a
// deployed preview can't be mistaken for one on real data. A small pill over
// the top edge: clicks pass through to the header under it, and its colours
// are fixed rather than themed, so it reads the same in every app style.
export const mocksBanner = style({
  position: "fixed",
  insetBlockStart: "env(safe-area-inset-top)",
  insetInlineStart: "50%",
  translate: "-50% 0",
  zIndex: 2,
  margin: 0,
  paddingBlock: "2px",
  paddingInline: vars.spacing.sm,
  borderEndStartRadius: vars.spacing.sm,
  borderEndEndRadius: vars.spacing.sm,
  background: "oklch(0.85 0.17 85)",
  color: "black",
  fontSize: vars.fontSize.xs,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  pointerEvents: "none",
});
