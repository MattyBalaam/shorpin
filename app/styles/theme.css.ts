import { createTheme } from "@vanilla-extract/css";

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
    controlRadius: "0.33rem",
  },
  palette: {
    primary: "#A9CBB7",
    secondary: "#EDEBA0",
    chrome: "grey",
    chromeLight: "lightGrey",
    text: "black",
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
});
