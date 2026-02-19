import { style, keyframes } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const listWrapper = style({
  display: "contents",
});

// extract this out mate
export const listLoader = style({
  gridColumn: "content",
  gridRow: "content",
  outline: "1px sold red",
  paddingBlock: vars.spacing.baseline,
  ":before": {
    content: " ",
    display: "inline-block",
    width: "1em",
    height: "1em",
    border: `3px solid ${vars.palette.primary}`,
    borderBottom: "none",
    borderRadius: "50%",
  },
});

export const list = style({
  listStyle: "none",
  padding: 0,
  gridColumn: "1 / -1",
  gridRow: "content",
  display: "grid",
  gridTemplateColumns: "subgrid",
  alignSelf: "start" /** prevents items from stretching vertically */,
});

export const itemWrapper = style({
  display: "grid",
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
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
  display: "flex",
  gridColumn: "content",
  justifyContent: "space-between",
  gap: vars.spacing.lg,
});

export const itemLink = style({
  marginRight: "auto",
  ":before": {
    content: "",
    position: "absolute",
    zIndex: 0,
    // background: "red",
    inset: 0,
  },
});

export const itemConfig = style({
  zIndex: 1,
});

const shimmer = keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.4 },
});

export const skeletonRow = style({
  display: "grid",
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  paddingBlock: vars.spacing.md,
  background: vars.palette.chrome,
  borderBottom: `1px solid ${vars.palette.chromeLight}`,
});

export const skeletonBar = style({
  gridColumn: "content",
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
    "(min-width: 100px)": {
      display: "inline",
    },
  },
});

export const signUpsCount = style({
  "@container": {
    "(min-width: 100px)": {
      display: "none",
    },
  },
});

export const newList = style({
  display: "flex",
  gap: vars.spacing.md,
});
