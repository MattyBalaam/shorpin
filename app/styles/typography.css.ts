import { globalStyle } from "@vanilla-extract/css";
import { vars } from "~/theme.css";
import { app } from "./layers.css";

// Base typography
globalStyle("body", {
  "@layer": {
    [app]: {
      fontFamily: vars.font.sans,
      fontSize: vars.fontSize.base,
      lineHeight: vars.lineHeight.normal,
      fontWeight: vars.fontWeight.normal,
      // Prevent font size inflation on mobile
      textSizeAdjust: "100%",
      // Enable font smoothing for better rendering
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    },
  },
});

// Headings
globalStyle("h1, h2, h3, h4, h5, h6", {
  "@layer": {
    [app]: {
      fontWeight: vars.fontWeight.bold,
      lineHeight: vars.lineHeight.tight,
      marginBlockStart: vars.spacing.xl,
      marginBlockEnd: vars.spacing.md,
    },
  },
});

globalStyle("h1", {
  "@layer": {
    [app]: {
      fontSize: vars.fontSize.xxl,
      marginBlockStart: 0,
    },
  },
});

globalStyle("h2", {
  "@layer": {
    [app]: {
      fontSize: vars.fontSize.xl,
    },
  },
});

globalStyle("h3", {
  "@layer": {
    [app]: {
      fontSize: vars.fontSize.lg,
    },
  },
});

globalStyle("h4", {
  "@layer": {
    [app]: {
      fontSize: vars.fontSize.md,
    },
  },
});

globalStyle("h5, h6", {
  "@layer": {
    [app]: {
      fontSize: vars.fontSize.base,
      fontWeight: vars.fontWeight.semibold,
    },
  },
});

// Paragraphs
globalStyle("p", {
  "@layer": {
    [app]: {
      marginBlockStart: 0,
      marginBlockEnd: vars.spacing.lg,
    },
  },
});

globalStyle("p:last-child", {
  "@layer": {
    [app]: {
      marginBlockEnd: 0,
    },
  },
});

// Links
globalStyle("a", {
  "@layer": {
    [app]: {
      color: "inherit",
      textDecorationColor: "currentColor",
      textDecorationThickness: "0.08em",
      textUnderlineOffset: "0.15em",
    },
  },
});

globalStyle("a:hover", {
  "@layer": {
    [app]: {
      textDecorationThickness: "0.12em",
    },
  },
});

// Lists
globalStyle("ul, ol", {
  "@layer": {
    [app]: {
      marginBlockStart: 0,
      marginBlockEnd: vars.spacing.lg,
      paddingInlineStart: vars.spacing.xl,
    },
  },
});

globalStyle("li", {
  "@layer": {
    [app]: {
      marginBlockEnd: vars.spacing.sm,
    },
  },
});

globalStyle("li:last-child", {
  "@layer": {
    [app]: {
      marginBlockEnd: 0,
    },
  },
});

// Code and preformatted text
globalStyle("code, kbd, samp, pre", {
  "@layer": {
    [app]: {
      fontFamily: vars.font.mono,
      fontSize: "0.9em",
    },
  },
});

globalStyle("pre", {
  "@layer": {
    [app]: {
      overflow: "auto",
      padding: vars.spacing.lg,
      marginBlockStart: 0,
      marginBlockEnd: vars.spacing.lg,
      borderRadius: "0.25rem",
    },
  },
});

globalStyle("code", {
  "@layer": {
    [app]: {
      padding: "0.125em 0.25em",
      borderRadius: "0.2em",
    },
  },
});

// Don't double-wrap code inside pre
globalStyle("pre code", {
  "@layer": {
    [app]: {
      padding: 0,
      fontSize: "inherit",
    },
  },
});

// Small text
globalStyle("small", {
  "@layer": {
    [app]: {
      fontSize: vars.fontSize.sm,
    },
  },
});

// Strong and bold
globalStyle("strong, b", {
  "@layer": {
    [app]: {
      fontWeight: vars.fontWeight.bold,
    },
  },
});

// Emphasis
globalStyle("em, i", {
  "@layer": {
    [app]: {
      fontStyle: "italic",
    },
  },
});

// Block quotes
globalStyle("blockquote", {
  "@layer": {
    [app]: {
      marginBlockStart: 0,
      marginBlockEnd: vars.spacing.lg,
      marginInlineStart: 0,
      marginInlineEnd: 0,
      paddingInlineStart: vars.spacing.xl,
      borderInlineStart: `0.25rem solid currentColor`,
      fontStyle: "italic",
    },
  },
});

// Horizontal rule
globalStyle("hr", {
  "@layer": {
    [app]: {
      marginBlockStart: vars.spacing.xxl,
      marginBlockEnd: vars.spacing.xxl,
      border: 0,
      borderBlockStart: "1px solid currentColor",
      opacity: 0.2,
    },
  },
});
