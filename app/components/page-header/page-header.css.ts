import {
  createContainer,
  createVar,
  globalStyle,
  style,
  styleVariants,
} from "@vanilla-extract/css";
import { vars } from "~/styles/theme.css";

export const actionCount = createVar();

// Below the width their labelled buttons need, actions show icons only. It's
// fixed per header, as a container query can't read its content's width:
// set to the widest app style (brutalist), with each header naming the
// container whose threshold fits its actions.
const thresholds = {
  // Home's pending sign-ups and Sign out (about 14.4rem in brutalist; most
  // styles need about 12rem).
  "15rem": createContainer(),
  // The list's Style, Colours and Group by tag (about 26.3rem in brutalist;
  // most styles need about 22rem).
  "27rem": createContainer(),
};

export type CompactBelow = keyof typeof thresholds;

const compactQueries = Object.entries(thresholds).map(
  ([width, container]) => `${container} (max-width: ${width})`,
);

// The breadcrumbs and the page's actions share one row, so the title and
// the buttons make room for each other instead of overlapping.
export const header = style({
  gridRow: "breadcrumbs",
  gridColumn: "content",
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.md,
  minWidth: 0,
});

// Takes whatever width the title leaves, but never less than its buttons
// need as icons, so a long title truncates rather than running under them.
const actionsBase = style({
  flex: `1 0 calc(${actionCount} * ${vars.spacing.controlHeight} + (${actionCount} - 1) * ${vars.spacing.sm})`,
  containerType: "inline-size",
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: vars.spacing.sm,
});

export const actions = styleVariants(thresholds, (container) => [
  actionsBase,
  { containerName: container },
]);

const hidden = { position: "absolute", transform: "scale(0.0001)" } as const;

// Visually hidden when compact, so it stays the control's accessible name.
export const label = style({
  "@container": Object.fromEntries(compactQueries.map((query) => [query, hidden])),
});

// Square icon-only controls when compact.
globalStyle(`${actionsBase} :is(a, button):has(> ${label})`, {
  "@container": Object.fromEntries(
    compactQueries.map((query) => [
      query,
      { width: vars.spacing.controlHeight, paddingInline: 0, justifyContent: "center" },
    ]),
  ),
});
