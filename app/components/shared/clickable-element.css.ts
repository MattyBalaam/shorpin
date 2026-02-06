import { style } from "@vanilla-extract/css";

export const clickable = style({
  appearance: "none",
  border: "none",
  padding: "0.3em 0.5em",
  textDecoration: "none",
  outline: "2px solid currentColor",
  minWidth: 0,
  width: "max-content",
  borderRadius: "3px",
  background: "none",
  display: "inline-block",
  ":hover": {
    opacity: 0.8,
  },
});
