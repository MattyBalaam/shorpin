import { style } from "@vanilla-extract/css";

export const visuallyHidden = style({
  position: "absolute",
  transform: "scale(0.0001)", // 0 causes a layout bug - polypane only?
});
