import { createTheme, style } from "@vanilla-extract/css";

export const [themeClass, vars] = createTheme({
  spacing: {
    appMargin: "1rem",
  },
  palette: {
    primary: "blue",
    secondary: "yellow",
  },
  //   font: {
  //     body: 'arial'
  //   }
});
