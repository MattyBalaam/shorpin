import { createContainer, style } from "@vanilla-extract/css";

const scroller = createContainer();

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
  overscrollBehaviorY: "none",
  // The containing block for absolutely positioned content (e.g. visually
  // hidden labels), which the scroller otherwise doesn't clip: rows scrolled
  // out of view would give the page itself scrollable overflow.
  position: "relative",
  containerName: scroller,
  containerType: "scroll-state",

  "@media": {
    "(prefers-reduced-motion: no-preference)": {
      scrollBehavior: "smooth",
    },
  },
});

// A zero-height strip stuck to one edge of the scrollport. Half its shadow is
// clipped by the scrollport, leaving a soft shade over the content. Hidden
// unless there's more to scroll past its edge: scroll-state queries say so
// where supported; elsewhere ScrollArea's `trackScrollEdges` mirrors them as
// `data-scrollable-*` attributes.
const edge = style({
  gridColumn: "1 / -1",
  position: "sticky",
  zIndex: 1,
  height: 0,
  pointerEvents: "none",
  opacity: 0,
  boxShadow: "0 0 0.75rem 0.375rem color-mix(in oklch, currentColor 30%, transparent)",
  transition: "opacity 150ms",
});

// Shows once there's content above.
export const edgeStart = style([
  edge,
  {
    insetBlockStart: 0,
    "@container": {
      [`${scroller} scroll-state(scrollable: top)`]: { opacity: 1 },
    },
    selectors: {
      [`${inner}[data-scrollable-top] > &`]: { opacity: 1 },
    },
  },
]);

// Shows until the end is reached.
export const edgeEnd = style([
  edge,
  {
    insetBlockEnd: 0,
    "@container": {
      [`${scroller} scroll-state(scrollable: bottom)`]: { opacity: 1 },
    },
    selectors: {
      [`${inner}[data-scrollable-bottom] > &`]: { opacity: 1 },
    },
  },
]);
