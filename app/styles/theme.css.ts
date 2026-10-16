import { createTheme } from "@vanilla-extract/css";
import { toAdaptiveCss } from "~/lib/palette";
import { classicStyle } from "./classic-style";

const DEFAULT_HUE = 218.1;

export const [themeClass, vars] = createTheme({
  spacing: {
    appMargin: "1rem",
    // Vertical rhythm based on 1.5rem baseline
    baseline: "1.5rem",
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "0.75rem", // 12px
    lg: "1rem", // 16px
    xl: "1.5rem", // 24px
    xxl: "2rem", // 32px
    xxxl: "3rem", // 48px
    // Shared height for all interactive controls (buttons, inputs)
    controlHeight: "1.8rem",
  },
  palette: {
    // Defaults for home and any list without its own palette: an "ocean
    // sunset" pair from the palette generator (app/lib/palette.ts), adapted
    // for dark mode the same way list palettes are. Primary's hex (#0fc1e5)
    // is in root.tsx's theme-color, the manifest and offline.html.
    primary: toAdaptiveCss(`oklch(0.749 0.133 ${DEFAULT_HUE})`),
    secondary: toAdaptiveCss("oklch(0.771 0.147 359.0)"),
    // Home's list rows: a deep shade of primary's hue, with white ink in
    // both schemes.
    surface: `light-dark(oklch(0.42 0.07 ${DEFAULT_HUE}), oklch(0.3 0.05 ${DEFAULT_HUE}))`,
    textOnSurface: "white",
    // Neutral grey for secondary ink and icons.
    chrome: "grey",
    chromeLight: "lightGrey",
    text: "black",
    // Ink for content painted directly on primary/secondary. Kept separate
    // from `text` because `text` also backs fixed elements (e.g. the solid
    // "Add" pill) that must stay dark regardless of colour scheme.
    textOnPalette: "light-dark(black, white)",
    textOnChrome: "white",
    textOnChromeDarkMode: "black",
    error: "red",
  },
  font: {
    // System font stack for optimal performance and native feel
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
  fontSize: {
    // Modular scale with 1.25 ratio (Major Third)
    xs: "0.64rem", // 10.24px
    sm: "0.8rem", // 12.8px
    base: "1rem", // 16px
    md: "1.25rem", // 20px
    lg: "1.563rem", // 25px
    xl: "1.953rem", // 31.25px
    xxl: "2.441rem", // 39px
    xxxl: "3.052rem", // 48.83px
  },
  lineHeight: {
    tight: "1.2",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.625",
    loose: "2",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  // Everything an app style (see app/lib/app-style.ts) can change. Defaults
  // are Classic; app-styles.css.ts reassigns the whole group per style.
  // Colours stay in `palette` so per-list themes still apply.
  style: classicStyle,
});
