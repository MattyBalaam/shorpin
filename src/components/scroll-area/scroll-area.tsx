import { type Element, onSettled } from "solid-js";
import * as styles from "./scroll-area.css";

/** Mirrors `scroll-state(scrollable: top | bottom)` as `data-scrollable-top`
 * / `data-scrollable-bottom`, for browsers without scroll-state queries (see
 * scroll-area.css.ts). Returns its cleanup. */
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

export function ScrollArea(props: { children?: Element }) {
  let scroller!: HTMLDivElement;
  // Solid 2 ref callbacks run unowned, so setup with a cleanup lives here.
  onSettled(() => trackScrollEdges(scroller));

  return (
    <div class={styles.outer}>
      <div ref={scroller} class={styles.inner}>
        <div aria-hidden="true" class={styles.edgeStart} />
        {props.children}
        <div aria-hidden="true" class={styles.edgeEnd} />
      </div>
    </div>
  );
}
