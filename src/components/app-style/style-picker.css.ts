import { fallbackVar, style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const options = style({
  display: "grid",
  gap: vars.spacing.sm,
  margin: 0,
  padding: 0,
  border: "none",
  minWidth: 0,
});

// Each option carries its own style attribute, so everything inside — fonts,
// radii, borders, the preview button — renders in the style it offers.
export const option = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  gridTemplateAreas: '"radio label preview" "radio description preview"',
  alignItems: "center",
  columnGap: vars.spacing.md,
  padding: vars.spacing.md,
  fontFamily: vars.style.bodyFont,
  border: "2px solid color-mix(in oklch, currentColor 15%, transparent)",
  borderRadius: vars.style.surfaceRadius,
  cursor: "pointer",
  selectors: {
    "&:has(:checked)": {
      borderColor: "currentColor",
      background: `color-mix(in oklch, ${vars.palette.primary} 20%, transparent)`,
    },
  },
});

export const radio = style({
  gridArea: "radio",
  // Undo the global text-input sizing from reset.css.ts.
  height: "auto",
  paddingInline: 0,
  margin: 0,
  accentColor: vars.palette.primary,
});

export const label = style({
  gridArea: "label",
  fontFamily: vars.style.headingFont,
  fontWeight: vars.style.headingWeight,
  textTransform: vars.style.headingTransform,
  letterSpacing: vars.style.headingTracking,
});

export const description = style({
  gridArea: "description",
  fontSize: vars.fontSize.sm,
  opacity: 0.75,
});

export const preview = style({
  gridArea: "preview",
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.sm,
  padding: vars.spacing.sm,
  background: fallbackVar(vars.style.itemBackground, vars.palette.secondary),
  backgroundImage: vars.style.sheen,
  outline: "1px solid color-mix(in oklch, currentColor 15%, transparent)",
  outlineOffset: "-1px",
  color: fallbackVar(vars.style.itemInk, vars.palette.textOnPalette),
  borderRadius: vars.style.controlRadius,
});

export const badge = style({
  paddingInline: vars.spacing.sm,
  fontSize: vars.fontSize.xs,
  background: vars.palette.primary,
  borderRadius: vars.style.pillRadius,
});

export const previewButton = style({
  pointerEvents: "none",
});
