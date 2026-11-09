import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

// A flex item in the page header (see PageHeader), which can shrink so the
// current page's title truncates before it reaches the header's actions.
export const nav = style({
  flex: "0 1 auto",
  minWidth: 0,
});

export const list = style({
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  gap: "0.5em",
  // Not baseline: the back link is a control whose first baseline is its
  // visually hidden label, which offsets the items and pads the header row.
  alignItems: "center",
});

export const item = style({
  // Drop typography's list-item spacing, which would pad the header row.
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5em",
  flexShrink: 0,
});

// Only the current page gives up width, so the links before it stay whole.
export const currentItem = style([item, { flexShrink: 1, minWidth: 0 }]);

export const link = style({
  display: "inline-flex",
  alignItems: "center",
});

export const currentPage = style({
  fontSize: "inherit",
  fontWeight: vars.fontWeight.bold,
  lineHeight: "inherit",
  margin: 0,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
