import { style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const item = style({
  display: "grid",
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  margin: 0,
  alignItems: "center",
  gap: vars.spacing.md,
  paddingBlock: vars.spacing.sm,
  backgroundColor: vars.palette.chromeLight,
  transition: "background-color 0.2s",
  userSelect: "none",
  WebkitUserSelect: "none",
  cursor: "grab",
  ":active": {
    cursor: "grabbing",
  },
  selectors: {
    "&[data-dragging]": {
      backgroundColor: vars.palette.chrome,
      transform: "scale(1.05)",
    },
  },
});

export const inner = style({
  outline: "1px solid transparent",
  display: "grid",
  gridColumn: "content",
  gridTemplateColumns: "[value] 1fr [drag] auto [status] auto [delete] auto",
  alignItems: "center",
});

export const dragHandle = style({
  gridColumn: "drag",
  cursor: "grab",
  touchAction: "none",
  paddingInline: vars.spacing.sm,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: vars.palette.chrome,
});

export const itemInput = style({
  gridColumn: "value",
  width: "100%",
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  fontSize: vars.fontSize.md,
  fontFamily: "inherit",
  border: "none",
  outline: "none",
  backgroundColor: "transparent",
  resize: "none",
  overflow: "hidden",
  fieldSizing: "content",
  minBlockSize: "attr(rows rlh)",
});

export const editedIndicator = style({
  gridColumn: "status",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const deleteButton = style({
  gridColumn: "delete",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  border: "none",
  backgroundColor: "transparent",
  color: vars.palette.chrome,
  cursor: "pointer",
  fontSize: vars.fontSize.sm,
  borderRadius: "50%",
  selectors: {
    "&:hover": {
      color: "black",
      backgroundColor: "rgb(0 0 0 / 0.1)",
    },
    "&:focus-visible": {
      outline: `2px solid ${vars.palette.text}`,
      outlineOffset: "2px",
    },
  },
});
