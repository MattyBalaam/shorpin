import { keyframes, style } from "@vanilla-extract/css";

const shadeHeight = "1.5rem";
const shade = "rgb(0 0 0 / 0.25)";

const fadeIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
const fadeOut = keyframes({ from: { opacity: 1 }, to: { opacity: 0 } });

export const outer = style({
  gridColumn: "1 / -1",
  gridRow: "content",
  overflow: "hidden",
  display: "grid",
  gridTemplateColumns: "subgrid",
});

// Edge shadows over the scrolling content, so it reads as passing under the
// bars. Painted, not a mask: a mask fades the content into the page behind,
// which is a white shade in light mode rather than a shadow.
//
// Each is a sticky pseudo-element inside the scroller (a negative margin
// keeps it out of the layout), driven by the scroller's own timeline: the top
// fades in over the first `shadeHeight` of scroll, the bottom fades out over
// the last, so each shows only while there's content past its edge. A list
// too short to scroll has an inactive timeline, so neither shows.
const edge = {
  content: '""',
  gridColumn: "1 / -1",
  position: "sticky",
  blockSize: shadeHeight,
  pointerEvents: "none",
  zIndex: 1,
  opacity: 0,
  animationTimingFunction: "linear",
  animationFillMode: "both",
  animationTimeline: "scroll(nearest block)",
} as const;

export const inner = style({
  gridColumn: "1 / -1",
  paddingBlock: "1rem",
  display: "grid",
  gridTemplateColumns: "subgrid",
  // The shadows take zero-height rows either side, so the content keeps the
  // whole height to itself as when it was the only row.
  gridTemplateRows: "auto 1fr auto",
  overflow: "auto",
  // Keeps the shadows' z-index local to the scroll area.
  isolation: "isolate",

  "::before": {
    ...edge,
    // Pinned to the scrollport's top edge, over the padding.
    insetBlockStart: "-1rem",
    marginBlockEnd: `calc(-1 * ${shadeHeight})`,
    background: `linear-gradient(to bottom, ${shade}, transparent)`,
    animationName: fadeIn,
    animationRange: `0 ${shadeHeight}`,
  },
  "::after": {
    ...edge,
    insetBlockEnd: "-1rem",
    marginBlockStart: `calc(-1 * ${shadeHeight})`,
    background: `linear-gradient(to top, ${shade}, transparent)`,
    animationName: fadeOut,
    animationRange: `calc(100% - ${shadeHeight}) 100%`,
  },

  "@media": {
    "(prefers-reduced-motion: no-preference)": {
      scrollBehavior: "smooth",
    },
  },
});
