import { globalStyle } from "@vanilla-extract/css";

import { reset } from "./layers.css";

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

globalStyle("html, body", {
  "@layer": {
    [reset]: {
      width: "100%",
      height: "100%",
    },
  },
});

/* Remove list styles on ul, ol elements with a list role, which suggests default styling will be removed */
globalStyle("ul[role='list'], ol[role='list']", {
  listStyle: "none",
});

/* Remove list styles on ul, ol elements with a list role, which suggests default styling will be removed */
// ul[role='list'],
// ol[role='list'] {
//   list-style: none;
// }
