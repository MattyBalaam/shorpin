import { fallbackVar, keyframes, style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

const itemBackground = fallbackVar(vars.style.itemBackground, vars.palette.secondary);

// Row icons are a muted shade of the row's ink rather than a fixed grey, so
// they keep their contrast on every app style's row colour. In `color`,
// currentColor is the inherited ink.
const iconInk = "color-mix(in oklab, currentColor 70%, transparent)";

export const itemContainer = style({
  display: "grid",
  gridTemplateColumns: "1fr",
  gridColumn: "1 / -1",
  width: "100%",
  background: itemBackground,
  backgroundImage: vars.style.sheen,
  borderBottom: vars.style.itemDivider,
  selectors: {
    "&[data-dismissing=true]": {
      background: vars.palette.error,
    },
  },
});

export const item = style({
  display: "grid",
  gridColumn: "1 / -1",
  gridTemplateColumns:
    "[input] minmax(0, 1fr) [state] auto [link] auto [edit] auto [drag] auto [done] auto",
  gap: vars.spacing.md,
  width: `min(60ch, calc(100% - (2 * ${vars.spacing.appMargin})))`,
  marginInline: "auto",
  paddingBlockStart: vars.spacing.sm,
  alignItems: "center",
});

export const value = style({
  gridRow: 1,
  gridColumn: "input / span 2",
  paddingBlock: vars.spacing.sm,
  lineHeight: 1.35,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
});

export const state = style({
  gridRow: 1,
  gridColumn: "state",
  paddingInlineEnd: vars.spacing.md,
});

export const newIndicator = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "1.1rem",
  paddingInline: vars.spacing.sm,
  borderRadius: vars.style.pillRadius,
  background: vars.palette.primary,
  color: vars.palette.textOnPalette,
  border: `1px solid ${vars.palette.textOnPalette}`,
  fontSize: vars.fontSize.xs,
  lineHeight: 1,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: vars.fontWeight.semibold,
});

export const dragHandle = style({
  gridColumn: "drag",
  userSelect: "none",
  // Vertical pans scroll the list; reordering on touch needs a long-press
  // first (see use-drag-list.ts). Horizontal moves still reach the swipe.
  touchAction: "pan-y",
  WebkitTouchCallout: "none",
  cursor: "grab",
  color: iconInk,
  display: "flex",
  justifyContent: "center",
  // With the hit area's half-gap either side, this makes it 44px wide.
  minInlineSize: `calc(44px - ${vars.spacing.md})`,
  position: "relative",
  ":hover": {
    color: "inherit",
  },
  ":active": {
    color: "cyan",
    cursor: "grabbing",
  },
  // Larger hit area, but only halfway into the column gap on each side so it
  // never covers the neighbouring edit and delete buttons.
  "::before": {
    content: '""',
    position: "absolute",
    insetBlock: "-1em",
    insetInline: `calc(${vars.spacing.md} / -2)`,
  },
});

export const linkButton = style({
  gridColumn: "link",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "center",
  color: iconInk,
  textDecoration: "none",
  minWidth: "44px",
  minHeight: "44px",
  borderRadius: vars.style.pillRadius,
  outline: "1px solid white",
  selectors: {
    "&:hover": {
      color: "inherit",
      background: "rgb(255 255 255 / 0.4)",
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.palette.textOnPalette}`,
      outlineOffset: "2px",
      background: "rgb(255 255 255 / 0.4)",
    },
  },
});

export const editButton = style({
  gridColumn: "edit",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  padding: 0,
  border: "none",
  borderRadius: "50%",
  background: "transparent",
  color: iconInk,
  cursor: "pointer",
  // Generous invisible hit area without widening the grid column.
  position: "relative",
  "::before": {
    content: '""',
    position: "absolute",
    insetBlock: "-8px",
    insetInline: `calc(${vars.spacing.md} / -2)`,
  },
  selectors: {
    "&:hover": {
      color: "inherit",
      background: "rgb(0 0 0 / 0.1)",
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.palette.textOnPalette}`,
      outlineOffset: "2px",
    },
  },
});

export const editIcon = style({
  width: "18px",
  height: "18px",
});

export const editTextarea = style({
  width: "100%",
  minHeight: "5lh",
  // Grows with its content where supported; otherwise scrolls.
  fieldSizing: "content",
  maxHeight: "50dvh",
  padding: vars.spacing.md,
  border: `1px solid ${vars.palette.chrome}`,
  borderRadius: vars.style.controlRadius,
  lineHeight: 1.35,
  resize: "vertical",
});

export const linkIcon = style({
  width: "22px",
  height: "22px",
  flexShrink: 0,
});

export const deleteButton = style({
  gridColumn: "done",
  display: "flex",
  placeContent: "center",
  margin: 0,
  padding: 0,
});

export const tick = style({
  fontSize: "18px",
  margin: 0,
  padding: 0,
  appearance: "none",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  ":hover": {
    opacity: 0.6,
  },
  ":active": {
    opacity: 0.2,
  },
});

// --- Reorderable variant (list route): the prototype's flat grey rows + circular
// delete button, ported from the old reorderable-item.css.ts design. ---

export const itemContainerReorderable = style({
  // Use the list's theme palette (primary/secondary are overridden per-list by
  // the Theme component) rather than a flat grey, with dark text for contrast
  // against the light pastel theme colours.
  // backgroundColor, not the shorthand, so itemContainer's sheen survives.
  backgroundColor: itemBackground,
  color: fallbackVar(vars.style.itemInk, vars.palette.textOnPalette),
});

// Background, ink, border, shadow and focus come from the Button's primary
// variant, so the close button is a solid control in every app style.
export const deleteReorderable = style({
  cursor: "pointer",
  width: "28px",
  height: "28px",
  padding: 0,
  margin: 0,
  borderRadius: "50%",
  fontSize: vars.fontSize.sm,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const spin = keyframes({
  "0%": {
    rotate: "0",
  },
  "100%": {
    rotate: "360deg",
  },
});

export const saving = style({
  content: "",
  "::before": {
    content: "",
    display: "inline-block",
    verticalAlign: "baseline",
    width: "1em",
    height: "1em",
    border: "3px solid green",
    borderRadius: "50%",
    borderBlockEndColor: "transparent",
    animation: `1s infinite ${spin}`,
  },
});
