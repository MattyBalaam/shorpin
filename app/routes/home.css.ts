import { style } from "@vanilla-extract/css";

const list = style({
  listStyle: "none",
  padding: 0,
  selectors: {
    "& a": {
      textDecoration: "none",
    },
  },
});

const form = style({
  display: "grid",
  gap: "1em",
  gridTemplateColumns: "[input] auto [button] min-content",
});
