import { fallbackVar, globalStyle } from "@vanilla-extract/css";

import { COLOR_SCHEME_ATTRIBUTE } from "~/lib/color-scheme";
import { reset } from "./layers.css";
import { vars } from "./theme.css";

globalStyle("html, body, ul, ol, li, dialog", {
  "@layer": {
    [reset]: {
      marginBlockEnd: 0,
      padding: 0,
      border: 0,
      fontSize: "100%",
      font: "inherit",
      verticalAlign: "baseline",
    },
  },
});

globalStyle("html", {
  "@layer": {
    [reset]: {
      boxSizing: "border-box",
      /* Prevent font size inflation */
      textSizeAdjust: "none",
    },
  },
});

globalStyle("*, *::before, *::after", {
  "@layer": {
    [reset]: {
      boxSizing: "inherit",
    },
  },
});

// The app shell is a fixed-height grid (see root.css.ts) that scrolls inside
// its own regions, never the page.
globalStyle("html, body", {
  "@layer": {
    [reset]: {
      width: "100%",
      height: "100%",
      margin: 0,
      overflow: "hidden",
    },
  },
});

// Only ever a single scheme, never `light dark`: light-dark() colours (see
// palette.ts's toAdaptiveCss) track it, and nothing else should change
// rendering as a side effect. "system" follows the OS; the device's own
// choice (see app/lib/color-scheme.ts) pins it, and its attribute selector
// outranks the bare `html` one.
globalStyle("html", {
  "@layer": {
    [reset]: {
      "@media": {
        "(prefers-color-scheme: dark)": {
          colorScheme: "dark",
        },
      },
    },
  },
});

for (const scheme of ["light", "dark"] as const) {
  globalStyle(`html[${COLOR_SCHEME_ATTRIBUTE}="${scheme}"]`, {
    "@layer": {
      [reset]: {
        colorScheme: scheme,
      },
    },
  });
}

/* Remove list styles on ul, ol elements with a list role, which suggests default styling will be removed */
globalStyle("ul[role='list'], ol[role='list']", {
  "@layer": {
    [reset]: {
      listStyle: "none",
    },
  },
});

// Every rule here sits in the reset layer, so any component class overrides
// it without needing extra specificity.
globalStyle("input, textarea", {
  "@layer": {
    [reset]: {
      // 16px or more stops iOS Safari zooming in on focus.
      fontSize: "16px",
      fontFamily: "sans-serif",
    },
  },
});

globalStyle("input", {
  "@layer": {
    [reset]: {
      height: vars.spacing.controlHeight,
      paddingInline: vars.spacing.md,
      borderRadius: vars.style.controlRadius,
      border: fallbackVar(vars.style.inputBorder, "none"),
    },
  },
});

globalStyle("input:focus", {
  "@layer": {
    [reset]: {
      outline: vars.style.focusOutline,
      outlineOffset: vars.style.focusOutlineOffset,
      boxShadow: vars.style.focusShadow,
    },
  },
});
