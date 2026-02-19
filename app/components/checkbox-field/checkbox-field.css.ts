import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const wrapper = style({
  display: "flex",
  alignItems: "flex-start",
  gap: vars.spacing.sm,
});

export const checkbox = style({
  appearance: "none",
  width: "1em",
  height: "1em",
  padding: 0,
  flexShrink: 0,
  border: `2px solid currentColor`,
  borderRadius: vars.spacing.controlRadius,
  cursor: "pointer",
  outlineOffset: 0,
  selectors: {
    "&:checked": {
      backgroundColor: "currentColor",
    },
    "&:checked::before": {
      content: '""',
      display: "block",
      width: "30%",
      height: "55%",
      borderRight: "2px solid white",
      borderBottom: "2px solid white",
      transform: "rotate(45deg)",
      margin: "10% auto 0",
    },
  },
});
