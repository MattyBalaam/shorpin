import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const deleteList = style({
  marginInlineEnd: "auto",
  color: "#c00000",
  selectors: {
    '&[class*="clickable-element_variant_destructive"]': {
      color: "#c00000",
    },
  },
  ":focus": {
    color: vars.palette.text,
  },
});
