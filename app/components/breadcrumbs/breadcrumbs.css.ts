import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const nav = style({
  gridRow: "breadcrumbs",
  gridColumn: "content",
  // Centred against the header's controls (sign out, list actions).
  alignSelf: "center",
});

export const list = style({
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexWrap: "wrap",
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
});

export const link = style({
  display: "inline-flex",
  alignItems: "center",
});

export const currentPage = style({
  fontSize: "inherit",
  fontWeight: vars.fontWeight.bold,
  lineHeight: "inherit",
  margin: 0,
  display: "inline-flex",
  alignItems: "center",
});
