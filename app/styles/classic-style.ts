// Token values for the Classic app style — the theme's defaults, and what the
// Classic preview card reassigns (see app-styles.css.ts). A plain module so
// both theme.css.ts and app-styles.css.ts can use it without a cycle.
//
// `initial` makes a custom property guaranteed-invalid, so components fall
// back to their own value via `fallbackVar` — here `revert`, so controls keep
// the browser's font and border exactly as Classic always has.
export const classicStyle = {
  bodyFont:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headingFont: "inherit",
  headingWeight: "700",
  headingTransform: "none",
  headingTracking: "normal",
  controlFont: "initial",
  controlWeight: "400",
  controlTransform: "none",
  controlTracking: "normal",
  controlRadius: "0.33rem",
  // 9999px clamps to half the element's shortest side, giving a true pill
  // shape regardless of content width. 50% would produce an ellipse on
  // non-square elements, so a large fixed value is the correct approach.
  pillRadius: "9999px",
  controlBorder: "initial",
  controlShadow: "none",
  controlActiveShadow: "none",
  controlActiveTranslate: "none",
  // Painted over the control's palette background, e.g. a gloss gradient.
  controlImage: "none",
  inputBorder: "none",
  focusOutline: "2px solid yellow",
  focusOutlineOffset: "0px",
  focusShadow: "none",
  // `initial` keeps a control's own background/ink when focused.
  focusBackground: "yellow",
  focusColor: "black",
  surfaceRadius: "0.5rem",
  surfaceBorder: "none",
  surfaceShadow: "none",
  backdrop: "rgb(0 0 0 / 0.4)",
  divider: "1px solid lightGrey",
  // Painted over palette-coloured bars and rows, e.g. a gloss gradient.
  sheen: "none",
  linkThickness: "0.08em",
  linkHoverThickness: "0.12em",
  linkOffset: "0.15em",
  // Surfaces. `initial` paints them with the palette as before; the accent
  // styles (Minimal, User agent, GOV.UK) swap in plain page colours and use
  // the palette only for rules, dividers and badges.
  controlBackground: "initial",
  controlInk: "initial",
  barBackground: "initial",
  barBorder: "none",
  rowBackground: "initial",
  rowInk: "initial",
  itemBackground: "initial",
  itemInk: "initial",
  itemDivider: "none",
};
