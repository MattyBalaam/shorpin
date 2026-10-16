import { createContainer, style } from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

const logOutContainer = createContainer();

export const logOut = style({
  gridRow: "breadcrumbs",
  gridColumn: "content",
  justifySelf: "end",
  containerName: logOutContainer,
  containerType: "inline-size",
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  // TODO let’s work out a nicer way for this
  minWidth: `calc(${vars.spacing.controlHeight} * 1.5)`,
});

export const logOutLabel = style({
  display: "none",
  "@container": {
    [`${logOutContainer} (min-width: 100px)`]: {
      display: "inline",
    },
  },
});

export const logOutIcon = style({
  "@container": {
    [`${logOutContainer} (min-width: 100px)`]: {
      display: "none",
    },
  },
});
