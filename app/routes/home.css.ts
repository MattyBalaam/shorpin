import { style } from "@vanilla-extract/css";
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

export const item = style({
  display: "flex",
  gridColumn: "content",
  justifyContent: "space-between",
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
  // zIndex: 1,
  "@media": {
    "(prefers-color-scheme: dark)": {
      color: vars.palette.textOnChromeDarkMode,
    },
  },
});

export const itemLink = style({
  ":before": {
    content: "",
    position: "absolute",
    zIndex: 0,
    // background: "red",
    inset: 0,
  },
});

export const itemDelete = style({
  zIndex: 1,
});

export const actions = style({
  gridColumn: "content",
});

export const newList = style({
  display: "flex",
  gap: vars.spacing.md,
});
