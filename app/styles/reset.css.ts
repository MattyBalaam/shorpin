import { globalStyle } from "@vanilla-extract/css";

import { reset } from "./layers.css";

globalStyle("html, body, ul, ol, li, dialog", {
  "@layer": {
    [reset]: {
      margin: 0,
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
    [reset]: { boxSizing: "border-box" },
  },
});

globalStyle("*, *::before, *::after", {
  "@layer": {
    [reset]: {
      boxSizing: "inherit",
    },
  },
});

globalStyle("html, body, #legacySpaRoot", {
  "@layer": {
    [reset]: {
      width: "100%",
      height: "100%",
    },
  },
});
