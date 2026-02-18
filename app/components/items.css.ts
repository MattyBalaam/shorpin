import { style, keyframes } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const wrapper = style({
  display: "grid",
  gridTemplateColumns: "subgrid",
  gridColumn: "1 / -1",
  cursor: "grab",
  marginBlockEnd: 0,
  color: vars.palette.textOnChrome,

  "@media": {
    "(prefers-color-scheme: dark)": {
      color: vars.palette.textOnChromeDarkMode,
    },
  },
  ":active": {
    cursor: "grabbing",
  },
});

export const items = style({
  display: "grid",
  gridTemplateColumns: "subgrid",
  gridColumn: "1 / -1",
  padding: 0,
  alignContent: "start",
});

const shimmer = keyframes({
  "0%, 100%": { opacity: 1 },
  "50%": { opacity: 0.4 },
});

export const skeletonItem = style({
  display: "grid",
  gridTemplateColumns: "subgrid",
  gridColumn: "1 / -1",
  paddingBlock: vars.spacing.sm,
  background: vars.palette.secondary,
});

export const skeletonContent = style({
  display: "grid",
  gridColumn: "content",
  gridTemplateColumns: "[input] 1fr [state] auto [drag] auto [done] auto",
  gap: vars.spacing.md,
  alignItems: "center",
});

export const skeletonBar = style({
  height: "1em",
  borderRadius: "3px",
  background: vars.palette.chrome,
  animation: `1.5s ease-in-out infinite ${shimmer}`,
  selectors: {
    "&:nth-child(1)": { gridColumn: "input" },
    "&:nth-child(2)": { gridColumn: "drag", width: "1em" },
    "&:nth-child(3)": { gridColumn: "done", width: "1em" },
  },
});
