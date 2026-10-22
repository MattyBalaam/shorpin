import { keyframes, style } from "@vanilla-extract/css";

export const outer = style({
  gridColumn: "1 / -1",
  gridRow: "content",
  overflow: "hidden",
  display: "grid",
  gridTemplateColumns: "subgrid",
});

export const inner = style({
  gridColumn: "1 / -1",
  display: "grid",
  gridTemplateColumns: "subgrid",
  // Otherwise spare height is shared with the edge strips' rows, pushing a
  // short list down.
  alignContent: "start",
  overflow: "auto",

  "@media": {
    "(prefers-reduced-motion: no-preference)": {
      scrollBehavior: "smooth",
    },
  },
});

const reveal = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

// A zero-height strip stuck to one edge of the scrollport. Half its shadow is
// clipped by the scrollport, leaving a soft shade over the content. Hidden
// unless its scroll timeline is active, i.e. the area actually scrolls.
const edge = style({
  gridColumn: "1 / -1",
  position: "sticky",
  zIndex: 1,
  height: 0,
  pointerEvents: "none",
  opacity: 0,
  boxShadow: "0 0 0.75rem 0.375rem color-mix(in oklch, currentColor 30%, transparent)",
  animationName: reveal,
  animationTimingFunction: "linear",
  animationFillMode: "both",
  animationTimeline: "scroll(nearest block)",
});

// Shows once there's content above.
export const edgeStart = style([
  edge,
  {
    insetBlockStart: 0,
    animationRange: "0 1.5rem",
  },
]);

// Shows until the end is reached.
export const edgeEnd = style([
  edge,
  {
    insetBlockEnd: 0,
    animationDirection: "reverse",
    animationRange: "calc(100% - 1.5rem) 100%",
  },
]);
