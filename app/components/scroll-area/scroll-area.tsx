import { type ReactNode } from "react";
import * as styles from "./scroll-area.css";

/** Ref callback mirroring `scroll-state(scrollable: top | bottom)` as
 * `data-scrollable-top` / `data-scrollable-bottom`, for browsers without
 * scroll-state queries (see scroll-area.css.ts). Module-level so React
 * doesn't re-attach it each render. */
function trackScrollEdges(scroller: HTMLDivElement) {
  if (CSS.supports("container-type", "scroll-state")) return;

  function update() {
    const { scrollTop, scrollHeight, clientHeight } = scroller;
    // A pixel's slack each way: fractional heights (and zoom) can leave
    // scrollTop just off either end.
    scroller.toggleAttribute("data-scrollable-top", scrollTop >= 1);
    scroller.toggleAttribute("data-scrollable-bottom", scrollTop < scrollHeight - clientHeight - 1);
  }

  update();
  scroller.addEventListener("scroll", update, { passive: true });
  // The scroller resizes with the viewport; its content as rows change.
  const observer = new ResizeObserver(update);
  observer.observe(scroller);
  for (const child of scroller.children) observer.observe(child);
  return () => {
    scroller.removeEventListener("scroll", update);
    observer.disconnect();
  };
}

export function ScrollArea({ children }: { children: ReactNode }) {
  return (
    <div className={styles.outer}>
      <div ref={trackScrollEdges} className={styles.inner}>
        <div aria-hidden className={styles.edgeStart} />
        {children}
        <div aria-hidden className={styles.edgeEnd} />
      </div>
    </div>
  );
}
