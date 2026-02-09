import { style } from "@vanilla-extract/css";

export const wrapper = style({
  display: "grid",
  gridTemplateColumns: "subgrid",
  gridColumn: "1 / -1",
  cursor: "grab",
  marginBlockEnd: 0,
  ":active": {
    cursor: "grabbing",
  },
});

export const items = style({
  display: "grid",
  gridTemplateColumns: "subgrid",
  gridColumn: "1 / -1",
  padding: 0,
  alignContent: "start",
});
