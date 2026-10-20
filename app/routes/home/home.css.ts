import { createContainer, fallbackVar, keyframes, style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

const rowBackground = fallbackVar(vars.style.rowBackground, vars.palette.surface);
const rowInk = fallbackVar(vars.style.rowInk, vars.palette.textOnSurface);

export const listWrapper = style({
  // Safari has intermittent shrink-to-content bugs with display: contents
  // when combined with nested grid/subgrid wrappers.
  display: "grid",
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  width: "100%",
  minWidth: 0,
});

export const list = style({
  listStyle: "none",
  padding: 0,
  gridColumn: "1 / -1",
  display: "grid",
  gridTemplateColumns: "subgrid",
  width: "100%",
  minWidth: 0,
  alignSelf: "start" /** prevents items from stretching vertically */,
});

export const itemWrapper = style({
  display: "grid",
  gridColumn: "1 / -1",
  // Keep row layout independent from subgrid during narrow Safari layouts.
  gridTemplateColumns: "1fr",
  width: "100%",
  minWidth: 0,
  paddingBlock: vars.spacing.md,
  background: rowBackground,
  backgroundImage: vars.style.sheen,
  margin: 0,
  borderBottom: vars.style.divider,
  color: rowInk,
  position: "relative",
});

const configWidth = `calc(${vars.spacing.controlHeight} * 1.5)`;

export const item = style({
  display: "grid",
  gridColumn: "1 / -1",
  // Rows are independent grids, so the config track is fixed rather than auto:
  // rows without the cog (lists you don't own) keep their actions aligned.
  gridTemplateColumns: `[name] 1fr [config] ${configWidth} [star] auto [drag] auto [status] 3ch`,
  alignItems: "center",
  gap: vars.spacing.lg,
  // Recreate the central content width without relying on subgrid line names.
  width: `min(60ch, calc(100% - (2 * ${vars.spacing.appMargin})))`,
  minWidth: 0,
  marginInline: "auto",
});

export const itemLink = style({
  gridColumn: "name",
  minWidth: 0,
  marginRight: "auto",
  ":before": {
    content: "",
    position: "absolute",
    zIndex: 0,
    inset: 0,
  },
});

export const pendingItemLink = style({
  gridColumn: "name",
  minWidth: 0,
  marginRight: "auto",
  opacity: 0.6,
  fontStyle: "italic",
});

export const itemConfig = style({
  gridColumn: "config",
  zIndex: 1,
  justifySelf: "center",
});

export const itemStar = style({
  gridColumn: "star",
  zIndex: 1,
  display: "flex",
});

export const itemStarButton = style({
  appearance: "none",
  background: "none",
  border: 0,
  padding: 0,
  font: "inherit",
  lineHeight: 1,
  cursor: "pointer",
  color: "inherit",
  opacity: 0.5,
  position: "relative",
  ":hover": {
    opacity: 1,
  },
  "::before": {
    content: '""',
    position: "absolute",
    inset: "-0.75rem",
  },
  selectors: {
    '&[aria-pressed="true"]': {
      opacity: 1,
      color: vars.palette.primary,
    },
  },
});

export const itemDragHandle = style({
  gridColumn: "drag",
  userSelect: "none",
  // Vertical pans scroll the list; reordering on touch needs a long-press
  // first (see use-drag-list.ts). Horizontal moves still reach the swipe.
  touchAction: "pan-y",
  WebkitTouchCallout: "none",
  cursor: "grab",
  color: rowInk,
  display: "flex",
  zIndex: 1,
  position: "relative",
  opacity: 0.7,
  ":hover": {
    opacity: 1,
    transform: "translateY(-1px)",
  },
  ":active": {
    color: "cyan",
    cursor: "grabbing",
    opacity: 1,
    transform: "translateY(0)",
  },
  "::before": {
    content: '""',
    position: "absolute",
    inset: "-0.75rem",
  },
});

export const itemStatus = style({
  gridColumn: "status",
  display: "grid",
  zIndex: 1,
  alignSelf: "center",
  justifyContent: "center",
  alignContent: "center",
});

export const itemTotal = style({
  fontSize: vars.fontSize.xs,
  textAlign: "center",
});

export const unreadBadge = style({
  fontSize: vars.fontSize.xs,
  background: vars.palette.primary,
  color: vars.palette.textOnPalette,
  borderRadius: vars.style.pillRadius,
  paddingInline: vars.spacing.sm,
  minWidth: "1.5em",
});

const shimmer = keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.4 },
});

export const skeletonRow = style({
  display: "grid",
  gridColumn: "1 / -1",
  gridTemplateColumns: "1fr",
  paddingBlock: vars.spacing.md,
  background: rowBackground,
  borderBottom: vars.style.divider,
});

export const skeletonBar = style({
  gridColumn: "1 / -1",
  width: `min(60ch, calc(100% - (2 * ${vars.spacing.appMargin})))`,
  marginInline: "auto",
  height: "1em",
  borderRadius: "3px",
  background: vars.palette.primary,
  opacity: 0.3,
  animation: `1.5s ease-in-out infinite ${shimmer}`,
  selectors: {
    "&:nth-child(1)": { maxWidth: "55%" },
    "&:nth-child(2)": { maxWidth: "75%" },
    "&:nth-child(3)": { maxWidth: "40%" },
  },
});

export const actions = style({
  gridColumn: "content",
  display: "flex",
  alignItems: "end",
  justifyContent: "space-between",
  gap: vars.spacing.md,
});

export const addListForm = style({
  minWidth: 0,
});

// Below this width the left gutter is too narrow for "N pending", which then
// overlaps the breadcrumbs, so the link moves beside the sign-out button.
// Roughly the 60ch column plus a 10ch-wide gutter either side.
const narrowGutter = "screen and (max-width: 48rem)";

const pendingSignUpsContainer = createContainer();

export const pendingSignUps = style({
  gridRow: "breadcrumbs",
  gridColumn: "left",
  containerName: pendingSignUpsContainer,
  containerType: "inline-size",
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  paddingInlineStart: vars.spacing.md,
  "@media": {
    [narrowGutter]: {
      gridColumn: "content",
      justifySelf: "end",
      // Shrink-wrapped here, so it can't be a size container.
      containerType: "normal",
      paddingInlineStart: 0,
      // Clears the sign-out button, which shares this cell (see layout.css.ts).
      marginInlineEnd: `calc(${vars.spacing.controlHeight} * 1.5 + ${vars.spacing.md})`,
    },
  },
});

export const signUpsLabel = style({
  display: "none",
  "@container": {
    [`${pendingSignUpsContainer} (min-width: 10ch)`]: {
      display: "inline",
    },
  },
  "@media": {
    [narrowGutter]: {
      display: "inline",
    },
  },
});

export const newList = style({
  display: "flex",
  gap: vars.spacing.md,
});

export const formError = style({
  gridColumn: "content",
  color: vars.palette.error,
  margin: 0,
});

// HydrateFallback sits in <main>'s grid beside the breadcrumbs, so it needs
// its own cell: auto-placed, it lands on the breadcrumbs row and overlaps them.
export const hydrateFallback = style({
  gridRow: "content",
  gridColumn: "content",
  placeSelf: "center",
});
