import { ReactNode } from "react";

import * as style from "./actions.css";

export function Actions({ children }: { children: ReactNode }) {
  return <section className={style.actionsWrapper}>{children}</section>;
}
