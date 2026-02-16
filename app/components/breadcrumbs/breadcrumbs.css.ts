import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const nav = style({
  gridRow: "breadcrumbs",
  gridColumn: "content",
});

export const list = style({
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5em",
  alignItems: "baseline",
});

export const item = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5em",
});

export const separator = style({
  opacity: 0.5,
  userSelect: "none",
  display: "inline-flex",
  alignItems: "center",
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
