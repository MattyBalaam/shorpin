import { style, keyframes } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const itemContainer = style({
  display: "grid",
  gridTemplateColumns: "subgrid",
  gridColumn: "1 / -1",
  paddingBlock: vars.spacing.sm,
  background: vars.palette.secondary,
  selectors: {
    "&:has(input:focus)": {
      background: vars.palette.primary,
    },
    "&[data-dismissing]": {
      background: "red",
    },
    "&[data-deleting]": {
      opacity: 0.4,
      transition: "opacity 0.15s ease",
    },
  },
});

export const item = style({
  display: "grid",
  gridColumn: "content",
  gridTemplateColumns: "[input] 1fr [state] auto [drag] auto [done] auto",
  gap: vars.spacing.md,
  alignItems: "baseline",
});

export const input = style({
  border: "1px solid transparent",
  gridRow: 1,
  gridColumn: "input / span 2",
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  marginLeft: `calc(0px - ${vars.spacing.md})`,
  borderRadius: "3px",
  background: "transparent",
  color: "currentColor",
  textOverflow: "ellipsis",
  ":focus": {
    outline: "0 none",
    background: "white",
    color: "black",
  },
  "@media": {
    "(prefers-color-scheme: dark)": {
      ":focus": {
        background: "black",
        color: "white",
      },
    },
  },
});

export const state = style({
  gridRow: 1,
  gridColumn: "state",
  paddingInlineEnd: vars.spacing.md,
});

export const dragHandle = style({
  gridColumn: "drag",
  userSelect: "none",
  touchAction: "none",
  cursor: "grab",
  color: vars.palette.chrome,
  display: "flex",
  position: "relative",
  ":hover": {
    color: "black",
  },
  ":active": {
    color: "cyan",
  },
  "::before": {
    content: '""',
    position: "absolute",
    inset: "-1em",
  },
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
