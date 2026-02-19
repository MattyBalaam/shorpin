import { style } from "@vanilla-extract/css";

export const outer = style({
  gridColumn: "1 / -1",
  gridRow: "content",
  overflow: "hidden",
  display: "grid",
  gridTemplateColumns: "subgrid",
  maskImage: `linear-gradient(to bottom,
    transparent,
    black 1.5rem,
    black calc(100% - 1.5rem),
    transparent
  )`,
});

export const inner = style({
  gridColumn: "1 / -1",
  paddingBlock: "1rem",
  display: "grid",
  gridTemplateColumns: "subgrid",
  overflow: "auto",
});
