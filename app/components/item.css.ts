import { style } from "@vanilla-extract/css";

export const input = style({
  border: "1px solid transparent",
  // borderBottom: "1px dotted currentColor",
  gridColumn: "input",
  padding: "0.5em",
  borderRadius: "6px",
  ":focus": {
    outline: "0 none",
  },
});

export const deleteButton = style({
  display: "flex",
  placeContent: "center",
  margin: 0,
  padding: 0,
  gridColumn: "done",
});

export const tick = style({
  fontSize: "18px",
  margin: 0,
  padding: 0,
  appearance: "none",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  ":hover": {
    opacity: 0.6,
  },
  ":active": {
    opacity: 0.2,
  },
});

// const showTick = style({
//   opacity: 1,
//   transform: "scale(1)",
//   transition: "0.3s all cubic-bezier(0.51, 1.31, 0.37, 1.23)",
// });

// const wrapper = style({
//   display: "grid",
//   gridTemplateColumns: "subgrid",
//   gridColumn: "1 / span 3",
// });

export const itemContainer = style({
  display: "grid",
  gridTemplateColumns: "subgrid",
  gridColumn: "1 / 4",
  padding: "0.2rem",
  background: "grey",
  borderRadius: "8px",
  gap: "0.5em",
  verticalAlign: "middle",
  selectors: {
    "&:has(input:focus)": {
      background: "black",
    },
  },
});

export const dragHandle = style({
  gridColumn: "drag",
  userSelect: "none",
  touchAction: "none",
  cursor: "grab",
  color: "white",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  position: "relative",
  ":hover": {
    color: "black",
  },
  ":before": {
    content: '""',
    position: "absolute",
    inset: "-1em",
  },
});

export const dragHandleDragging = style({
  color: "cyan",
});
