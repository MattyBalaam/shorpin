import { style } from "@vanilla-extract/css";

export const visuallyHidden = style({
  position: "absolute",
  clipPath: "circle(0)",
});
