import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

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
  background: vars.palette.chrome,
  margin: 0,
  borderBottom: `1px solid ${vars.palette.chromeLight}`,
  color: vars.palette.textOnChrome,
  position: "relative",
  "@media": {
    "(prefers-color-scheme: dark)": {
      color: vars.palette.textOnChromeDarkMode,
    },
  },
});

export const item = style({
  display: "grid",
  gridColumn: "1 / -1",
  gridTemplateColumns: "[name] 1fr [drag] auto [config] auto [status] auto",
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

export const itemConfig = style({
  gridColumn: "config",
  zIndex: 1,
});

export const itemDragHandle = style({
  gridColumn: "drag",
  userSelect: "none",
  touchAction: "none",
  cursor: "grab",
  color: vars.palette.textOnChrome,
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
    opacity: 1,
    transform: "translateY(0)",
  },
  "::before": {
    content: '""',
    position: "absolute",
    inset: "-0.75rem",
  },
  "@media": {
    "(prefers-color-scheme: dark)": {
      color: vars.palette.textOnChromeDarkMode,
    },
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
  color: vars.palette.text,
  borderRadius: vars.radius.pill,
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
  background: vars.palette.chrome,
  borderBottom: `1px solid ${vars.palette.chromeLight}`,
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
});

export const pendingSignUps = style({
  gridRow: "breadcrumbs",
  gridColumn: "left",
  containerType: "inline-size",
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  paddingInlineStart: vars.spacing.md,
});

export const signUpsLabel = style({
  display: "none",
  "@container": {
    "(min-width: 10ch)": {
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

export const errorState = style({
  gridColumn: "content",
  gridRow: "content / -1",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.spacing.lg,
  textAlign: "center",
  paddingInline: vars.spacing.appMargin,
});
