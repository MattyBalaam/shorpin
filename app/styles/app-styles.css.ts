import { createGlobalTheme, globalStyle } from "@vanilla-extract/css";
import { APP_STYLE_ATTRIBUTE, type AppStyle } from "~/lib/app-style";
import { classicStyle } from "./classic-style";
import { themeClass, vars } from "./theme.css";

// Each app style reassigns every `vars.style` token on whichever element
// carries the attribute: <html> for the live app, or a preview card in the
// style picker. Custom properties inherit, so the nearest attribute wins and
// a card previews its own style inside any other. Colour comes from
// `vars.palette` (or the plain page colours, for the accent styles), so
// per-list palettes still apply. `createGlobalTheme` requires the full
// group, so a style can't inherit a stray token from an outer one.

const { primary, secondary, chromeLight, text } = vars.palette;

const systemSans = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const mono =
  'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace';
const y2kFont = '"Trebuchet MS", Verdana, Tahoma, sans-serif';

// Brutalist, Y2K and MySpace paint their surfaces with the palette, as Classic does.
const paletteSurfaces = {
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

// Minimal, User agent and GOV.UK keep surfaces to the plain page colours
// (Canvas/CanvasText, so dark mode follows) and use the palette as accents:
// a rule over the action bar, list items divided in the list's own colour,
// badges and focus rings.
function accentSurfaces(rule: string) {
  return {
    controlBackground: "CanvasText",
    controlInk: "Canvas",
    barBackground: "Canvas",
    barBorder: `${rule} solid ${primary}`,
    rowBackground: "Canvas",
    rowInk: "CanvasText",
    itemBackground: "Canvas",
    itemInk: "CanvasText",
    itemDivider: `2px solid ${secondary}`,
  };
}

const styles = {
  classic: classicStyle,

  minimal: {
    bodyFont: systemSans,
    headingFont: "inherit",
    headingWeight: "600",
    headingTransform: "none",
    headingTracking: "-0.02em",
    controlFont: systemSans,
    controlWeight: "500",
    controlTransform: "none",
    controlTracking: "-0.01em",
    controlRadius: "0.5rem",
    pillRadius: "9999px",
    controlBorder: "1px solid color-mix(in oklch, currentColor 12%, transparent)",
    controlShadow: "0 1px 2px rgb(0 0 0 / 0.08)",
    controlActiveShadow: "none",
    controlActiveTranslate: "0 1px",
    controlImage: "none",
    inputBorder: "1px solid color-mix(in oklch, currentColor 20%, transparent)",
    focusOutline: `2px solid color-mix(in oklch, ${primary} 55%, black)`,
    focusOutlineOffset: "2px",
    focusShadow: "none",
    focusBackground: "initial",
    focusColor: "initial",
    surfaceRadius: "1rem",
    surfaceBorder: "1px solid color-mix(in oklch, CanvasText 10%, transparent)",
    surfaceShadow: "0 24px 48px -12px rgb(0 0 0 / 0.25)",
    backdrop: "rgb(0 0 0 / 0.25)",
    divider: "1px solid color-mix(in oklch, currentColor 12%, transparent)",
    sheen: "none",
    linkThickness: "1px",
    linkHoverThickness: "2px",
    linkOffset: "0.25em",
    ...accentSurfaces("2px"),
  },

  // Most of this style is the `@scope` revert below; these tokens only cover
  // what's left (badges, rows, the dialog backdrop).
  "user-agent": {
    bodyFont: "serif",
    headingFont: "inherit",
    headingWeight: "700",
    headingTransform: "none",
    headingTracking: "normal",
    controlFont: "system-ui",
    controlWeight: "400",
    controlTransform: "none",
    controlTracking: "normal",
    controlRadius: "0px",
    pillRadius: "0px",
    controlBorder: "initial",
    controlShadow: "none",
    controlActiveShadow: "none",
    controlActiveTranslate: "none",
    controlImage: "none",
    inputBorder: "initial",
    focusOutline: "auto",
    focusOutlineOffset: "0px",
    focusShadow: "none",
    focusBackground: "initial",
    focusColor: "initial",
    surfaceRadius: "0px",
    surfaceBorder: "medium solid CanvasText",
    surfaceShadow: "none",
    backdrop: "rgb(0 0 0 / 0.1)",
    divider: "1px solid color-mix(in oklch, CanvasText 25%, transparent)",
    sheen: "none",
    linkThickness: "auto",
    linkHoverThickness: "auto",
    linkOffset: "auto",
    ...accentSurfaces("medium"),
  },

  brutalist: {
    bodyFont: mono,
    headingFont: 'Impact, "Arial Black", "Helvetica Neue", sans-serif',
    headingWeight: "900",
    headingTransform: "uppercase",
    headingTracking: "-0.02em",
    controlFont: mono,
    controlWeight: "700",
    controlTransform: "uppercase",
    controlTracking: "0.05em",
    controlRadius: "0px",
    pillRadius: "0px",
    controlBorder: "3px solid currentColor",
    controlShadow: "4px 4px 0 currentColor",
    controlActiveShadow: "0 0 0 currentColor",
    controlActiveTranslate: "4px 4px",
    controlImage: "none",
    inputBorder: "3px solid currentColor",
    focusOutline: "4px solid currentColor",
    focusOutlineOffset: "3px",
    focusShadow: "none",
    focusBackground: "initial",
    focusColor: "initial",
    surfaceRadius: "0px",
    surfaceBorder: "4px solid currentColor",
    surfaceShadow: "12px 12px 0 currentColor",
    backdrop: "rgb(0 0 0 / 0.6)",
    divider: `3px solid ${text}`,
    sheen: "none",
    linkThickness: "3px",
    linkHoverThickness: "6px",
    linkOffset: "0.15em",
    ...paletteSurfaces,
  },

  // Patterned on the GOV.UK Design System: square controls with a darker
  // "plinth" shadow, thick inputs, and its yellow-and-black focus state.
  "gov-uk": {
    bodyFont: "arial, sans-serif",
    headingFont: "inherit",
    headingWeight: "700",
    headingTransform: "none",
    headingTracking: "normal",
    controlFont: "arial, sans-serif",
    controlWeight: "400",
    controlTransform: "none",
    controlTracking: "normal",
    controlRadius: "0px",
    pillRadius: "0px",
    controlBorder: "2px solid transparent",
    controlShadow: `0 2px 0 color-mix(in oklch, ${primary} 45%, black)`,
    controlActiveShadow: "none",
    controlActiveTranslate: "0 2px",
    controlImage: "none",
    inputBorder: "2px solid #0b0c0c",
    focusOutline: "3px solid transparent",
    focusOutlineOffset: "0px",
    focusShadow: "0 -2px #ffdd00, 0 4px #0b0c0c",
    focusBackground: "#ffdd00",
    focusColor: "#0b0c0c",
    surfaceRadius: "0px",
    surfaceBorder: "none",
    surfaceShadow: `inset 0 5px 0 ${primary}`,
    backdrop: "rgb(11 12 12 / 0.6)",
    divider: `1px solid ${chromeLight}`,
    sheen: "none",
    linkThickness: "max(1px, 0.0625rem)",
    linkHoverThickness: "max(3px, 0.1875rem)",
    linkOffset: "0.1578em",
    ...accentSurfaces("5px"),
    // GOV.UK's grey secondary button, so the palette stays an accent.
    controlBackground: "light-dark(#f3f2f1, #383f41)",
    controlInk: "CanvasText",
  },

  y2k: {
    bodyFont: y2kFont,
    headingFont: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
    headingWeight: "700",
    headingTransform: "none",
    headingTracking: "0.02em",
    controlFont: y2kFont,
    controlWeight: "700",
    controlTransform: "none",
    controlTracking: "0.02em",
    controlRadius: "9999px",
    pillRadius: "9999px",
    controlBorder: `1px solid color-mix(in oklch, ${primary} 55%, black)`,
    controlShadow:
      "inset 0 1px 0 rgb(255 255 255 / 0.8), inset 0 -2px 4px rgb(0 0 0 / 0.15), 0 2px 4px rgb(0 0 0 / 0.25)",
    controlActiveShadow: "inset 0 2px 4px rgb(0 0 0 / 0.3)",
    controlActiveTranslate: "0 1px",
    controlImage:
      "linear-gradient(rgb(255 255 255 / 0.75), rgb(255 255 255 / 0.15) 50%, rgb(255 255 255 / 0) 51%, rgb(255 255 255 / 0.3))",
    inputBorder: `2px solid color-mix(in oklch, ${primary} 60%, black)`,
    focusOutline: "2px solid transparent",
    focusOutlineOffset: "0px",
    focusShadow: `0 0 0 3px color-mix(in oklch, ${primary} 50%, white), 0 0 14px 2px ${primary}`,
    focusBackground: "initial",
    focusColor: "initial",
    surfaceRadius: "1.25rem",
    surfaceBorder: `3px solid ${primary}`,
    surfaceShadow: "0 0 0 6px rgb(255 255 255 / 0.5), 0 12px 32px rgb(0 0 0 / 0.35)",
    backdrop: `linear-gradient(135deg, color-mix(in oklch, ${primary} 55%, transparent), color-mix(in oklch, ${secondary} 55%, transparent))`,
    divider: "1px solid rgb(255 255 255 / 0.5)",
    sheen:
      "linear-gradient(rgb(255 255 255 / 0.45), rgb(255 255 255 / 0.1) 50%, rgb(0 0 0 / 0.04) 50%, rgb(255 255 255 / 0.15))",
    linkThickness: "2px",
    linkHoverThickness: "2px",
    linkOffset: "0.2em",
    ...paletteSurfaces,
  },

  // A mid-2000s profile page: Verdana body, Comic Sans headings, bevelled
  // form buttons, tiled backgrounds and a header band on boxes.
  myspace: {
    bodyFont: "Verdana, Arial, Helvetica, sans-serif",
    headingFont: '"Comic Sans MS", "Comic Neue", "Chalkboard SE", cursive',
    headingWeight: "700",
    headingTransform: "none",
    headingTracking: "normal",
    controlFont: "Verdana, Arial, Helvetica, sans-serif",
    controlWeight: "700",
    controlTransform: "none",
    controlTracking: "normal",
    controlRadius: "0px",
    pillRadius: "0.25rem",
    controlBorder: `2px outset color-mix(in oklch, ${primary} 70%, white)`,
    controlShadow: "none",
    controlActiveShadow: "inset 1px 1px 3px rgb(0 0 0 / 0.45)",
    controlActiveTranslate: "1px 1px",
    controlImage: "linear-gradient(rgb(255 255 255 / 0.35), rgb(255 255 255 / 0))",
    inputBorder: "2px inset ButtonBorder",
    focusOutline: `2px dashed color-mix(in oklch, ${primary} 50%, black)`,
    focusOutlineOffset: "2px",
    focusShadow: "none",
    focusBackground: "initial",
    focusColor: "initial",
    surfaceRadius: "0px",
    surfaceBorder: `1px solid color-mix(in oklch, ${primary} 50%, black)`,
    // A coloured header strip, like a profile box's title bar.
    surfaceShadow: `inset 0 0.75rem 0 ${primary}`,
    // A tiled checkerboard, as every profile background was.
    backdrop: `repeating-conic-gradient(color-mix(in oklch, ${primary} 70%, transparent) 0 25%, color-mix(in oklch, ${secondary} 70%, transparent) 0 50%) 0 0 / 2.5rem 2.5rem`,
    divider: `1px solid color-mix(in oklch, ${primary} 50%, black)`,
    sheen:
      "repeating-linear-gradient(45deg, rgb(255 255 255 / 0.14) 0 0.4rem, transparent 0.4rem 0.8rem)",
    linkThickness: "1px",
    linkHoverThickness: "2px",
    linkOffset: "auto",
    ...paletteSurfaces,
  },
} satisfies Record<AppStyle, typeof classicStyle>;

for (const [name, values] of Object.entries(styles)) {
  const selector = `[${APP_STYLE_ATTRIBUTE}="${name}"]`;
  // On <html> the selector has to outrank themeClass, which sets the same
  // properties on the same element.
  createGlobalTheme(`${themeClass}${selector}, ${selector}`, vars.style, values);
}

// User agent: drop the app's own styling on text and controls so the browser's
// defaults show through. `revert` rolls back the whole author origin, so it
// needs !important to beat component classes (and their :hover/:focus
// states). The scope stops at a nested preview card for another style.
const userAgent = `[${APP_STYLE_ATTRIBUTE}="user-agent"]`;
const userAgentScope = `(${userAgent}) to ([${APP_STYLE_ATTRIBUTE}]:not(${userAgent}))`;

globalStyle(":scope :is(body, h1, h2, h3, h4, h5, h6, p, legend, small, strong)", {
  "@scope": {
    [userAgentScope]: {
      fontFamily: "revert !important",
      fontSize: "revert !important",
      fontWeight: "revert !important",
      letterSpacing: "revert !important",
      textTransform: "revert !important",
    },
  },
});

globalStyle(":scope :is(button, input, textarea, select, a)", {
  "@scope": {
    [userAgentScope]: {
      // csstype has no !important variant for the keyword-only appearance type.
      appearance: "revert !important" as "revert",
      background: "revert !important",
      border: "revert !important",
      borderRadius: "revert !important",
      boxShadow: "revert !important",
      color: "revert !important",
      font: "revert !important",
      letterSpacing: "revert !important",
      textTransform: "revert !important",
      textDecoration: "revert !important",
      height: "revert !important",
      paddingInline: "revert !important",
      outline: "revert !important",
      outlineOffset: "revert !important",
      opacity: "revert !important",
      translate: "revert !important",
    },
  },
});

// Reverting `font` drops text fields back to the browser's ~13px, which makes
// iOS Safari zoom in on focus; keep the reset layer's 16px floor.
globalStyle(":scope :is(input, textarea)", {
  "@scope": {
    [userAgentScope]: {
      fontSize: "16px !important",
    },
  },
});
