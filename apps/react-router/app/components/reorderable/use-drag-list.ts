import { type PointerEvent as ReactPointerEvent, useLayoutEffect, useRef } from "react";

// Movement before a gesture commits to an axis — matches Motion's
// dragDirectionLock threshold, so a slightly diagonal start doesn't misfire.
const DIRECTION_LOCK_PX = 10;
// Touch reorders need a deliberate press-and-hold on the handle first, so a
// vertical thumb movement over it scrolls the list instead (see the handle's
// `touch-action: pan-y`).
const LONG_PRESS_MS = 300;
const SWIPE_DISMISS_DISTANCE_PX = 140;
const SWIPE_DISMISS_VELOCITY_PX_S = 500;
const VELOCITY_WINDOW_MS = 100;
const DISMISS_DURATION_MS = 200;
// A queued layout snapshot that never saw a matching commit is discarded
// rather than animating some later, unrelated change from stale positions.
const SNAPSHOT_TTL_MS = 1000;
const FLIP_ANIMATION_ID = "drag-list-flip";
const ITEM_SELECTOR = ":scope > [data-reorder-id]";

/**
 * Samples a damped spring (unit mass, 0 → 1) into a CSS `linear()` easing so
 * WAAPI can play spring motion without a physics runtime.
 */
function springTiming(stiffness: number, damping: number) {
  const stepSeconds = 1 / 1000;
  const sampleEveryMs = 16;
  const points: string[] = [];
  let position = 0;
  let velocity = 0;
  let elapsedMs = 0;

  while (elapsedMs < 2000) {
    if (elapsedMs % sampleEveryMs === 0) points.push(position.toFixed(3));
    if (Math.abs(1 - position) < 0.001 && Math.abs(velocity) < 0.01) break;
    velocity += (-stiffness * (position - 1) - damping * velocity) * stepSeconds;
    position += velocity * stepSeconds;
    elapsedMs += 1;
  }
  points.push("1");

  return { duration: elapsedMs, easing: `linear(${points.join(", ")})` };
}

// Same parameters the Motion implementation used: an explicit 500/40 spring
// for release, Motion's default 500/25 for siblings sliding into place.
const RELEASE_SPRING = springTiming(500, 40);
const LAYOUT_SPRING = springTiming(500, 25);

export interface SwipeOptions {
  /** Called as the dismiss animation starts (e.g. to tint the row). */
  onDismissStart?: () => void;
  /** Called once the row has animated off screen. */
  onDismiss: () => void;
}

export interface StartDragOptions {
  /** Scale applied while the row is lifted. */
  liftScale?: number;
  /** Enables horizontal swipe-to-dismiss; without it every drag reorders. */
  swipe?: SwipeOptions;
}

interface Gesture {
  id: string;
  element: HTMLElement;
  options: StartDragOptions;
  startX: number;
  startY: number;
  groupTopAtStart: number;
  axis: "x" | "y" | null;
  // A touch long-press lifted the row: vertical moves reorder straight away.
  lifted: boolean;
  liftTimer: number | undefined;
  offsetX: number;
  // Pointer travel along y in group coordinates, so scrolling the list (or
  // page) mid-drag keeps the row under the pointer.
  groupOffsetY: number;
  layoutTopAtStart: number;
  layoutTops: Map<string, { top: number; bottom: number }>;
  order: string[];
  awaitingCommit: boolean;
  releasePending: boolean;
  samples: Array<{ time: number; x: number }>;
}

interface Snapshot {
  key: string;
  time: number;
  tops: Map<string, number>;
}

function itemElements(group: HTMLElement) {
  return Array.from(group.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
}

function itemId(element: HTMLElement) {
  return element.dataset.reorderId ?? "";
}

function orderKey(group: HTMLElement) {
  return itemElements(group).map(itemId).join("\n");
}

function cancelFlip(element: HTMLElement) {
  for (const animation of element.getAnimations()) {
    if (animation.id === FLIP_ANIMATION_ID) animation.cancel();
  }
}

function ignoreCancel() {
  // Animations cancelled by a newer gesture reject `finished`; nothing to do.
}

/**
 * Pointer-driven drag-to-reorder and swipe-to-dismiss for a list, built on
 * pointer events + the Web Animations API. Replaces Motion's Reorder.Group /
 * Reorder.Item / AnimatePresence / useAnimate with only what our lists use.
 *
 * - Attach `groupRef` to the list element; mark each row with
 *   `data-reorder-id`.
 * - Call `startDrag` from a drag handle's `onPointerDown`.
 * - Call `collapse` to animate a row's height away before removing it.
 *
 * Order changes are reported through `onReorder` (live, during the drag) and
 * `onDragEnd` (once the pointer is released); the owner re-renders the rows in
 * the new order and this hook FLIP-animates siblings into their new slots.
 */
export function useDragList<Group extends HTMLElement>({
  onReorder,
  onDragEnd,
}: {
  onReorder: (order: string[]) => void;
  onDragEnd: () => void;
}) {
  const groupRef = useRef<Group>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  const removingRef = useRef(new WeakSet<HTMLElement>());
  // Gesture listeners outlive the render that registered them, so they read
  // callbacks through this ref (refreshed every commit) rather than closures.
  const callbacksRef = useRef({ onReorder, onDragEnd });

  function measureLayout(gesture: Gesture) {
    const group = groupRef.current;
    if (!group) return;
    gesture.layoutTops.clear();
    // offsetTop ignores transforms, so in-flight FLIPs and the lifted row's own
    // translate/scale never skew the reorder thresholds.
    for (const element of itemElements(group)) {
      gesture.layoutTops.set(itemId(element), {
        top: element.offsetTop,
        bottom: element.offsetTop + element.offsetHeight,
      });
    }
  }

  function applyTransform(gesture: Gesture) {
    const { element, options } = gesture;
    if (!gesture.axis) return;
    const layoutTop = gesture.layoutTops.get(gesture.id)?.top ?? gesture.layoutTopAtStart;
    const x = gesture.axis === "x" ? gesture.offsetX : 0;
    const y =
      gesture.axis === "y" ? gesture.groupOffsetY - (layoutTop - gesture.layoutTopAtStart) : 0;
    const scale = options.liftScale ?? 1;
    element.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  /** Records every row's on-screen position so the next commit can FLIP. */
  function snapshot() {
    const group = groupRef.current;
    if (!group) return;
    const groupTop = group.getBoundingClientRect().top;
    const tops = new Map<string, number>();
    for (const element of itemElements(group)) {
      tops.set(itemId(element), element.getBoundingClientRect().top - groupTop);
    }
    snapshotRef.current = { key: orderKey(group), time: performance.now(), tops };
  }

  function maybeReorder(gesture: Gesture, direction: number) {
    if (gesture.awaitingCommit || direction === 0) return;

    const index = gesture.order.indexOf(gesture.id);
    const neighbourId = gesture.order[index + direction];
    const neighbour = neighbourId && gesture.layoutTops.get(neighbourId);
    const self = gesture.layoutTops.get(gesture.id);
    if (!neighbour || !self) return;

    const neighbourCentre = (neighbour.top + neighbour.bottom) / 2;
    const visualTop = gesture.layoutTopAtStart + gesture.groupOffsetY;
    const visualBottom = visualTop + (self.bottom - self.top);
    const crossed = direction > 0 ? visualBottom > neighbourCentre : visualTop < neighbourCentre;
    if (!crossed) return;

    const order = [...gesture.order];
    [order[index], order[index + direction]] = [order[index + direction], order[index]];
    snapshot();
    gesture.order = order;
    gesture.awaitingCommit = true;
    callbacksRef.current.onReorder(order);
  }

  function settle(element: HTMLElement) {
    const from = element.style.transform;
    element.style.transform = "";
    element
      .animate([{ transform: from || "none" }, { transform: "none" }], RELEASE_SPRING)
      .finished.then(() => {
        element.style.zIndex = "";
      }, ignoreCancel);
  }

  function release(gesture: Gesture, cancelled: boolean, time: number) {
    if (gesture.awaitingCommit) {
      // Let the pending reorder commit first so the row settles into its new
      // slot rather than the one it just left.
      gesture.releasePending = true;
      return;
    }
    gestureRef.current = null;
    window.clearTimeout(gesture.liftTimer);

    const { element, options, axis } = gesture;
    if (!axis) return;

    if (axis === "x" && options.swipe && !cancelled) {
      const recent = gesture.samples.filter((sample) => time - sample.time <= VELOCITY_WINDOW_MS);
      const first = recent.at(0);
      const last = recent.at(-1);
      const velocity =
        first && last && last.time > first.time
          ? ((last.x - first.x) / (last.time - first.time)) * 1000
          : 0;
      const flung =
        Math.abs(gesture.offsetX) > SWIPE_DISMISS_DISTANCE_PX ||
        Math.abs(velocity) > SWIPE_DISMISS_VELOCITY_PX_S;

      if (flung) {
        const { swipe } = options;
        const direction = gesture.offsetX > 0 ? 1 : -1;
        removingRef.current.add(element);
        swipe.onDismissStart?.();
        element
          .animate(
            [
              { transform: element.style.transform, opacity: 1 },
              { transform: `translateX(${direction * window.innerWidth}px)`, opacity: 0 },
            ],
            { duration: DISMISS_DURATION_MS, easing: "ease-out", fill: "forwards" },
          )
          .finished.then(() => {
            snapshot();
            swipe.onDismiss();
          }, ignoreCancel);
        return;
      }
    }

    settle(element);
    if (axis === "y") callbacksRef.current.onDragEnd();
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>, options: StartDragOptions = {}) {
    const group = groupRef.current;
    const handle = event.currentTarget;
    const element = handle.closest<HTMLElement>("[data-reorder-id]");
    if (!group || !element || event.button !== 0 || gestureRef.current) return;
    if (removingRef.current.has(element)) return;

    // Stops text selection and focus moving to the handle on mouse drags.
    event.preventDefault();

    for (const animation of element.getAnimations()) animation.cancel();
    element.style.transform = "";
    for (const sibling of itemElements(group)) cancelFlip(sibling);

    const gesture: Gesture = {
      id: itemId(element),
      element,
      options,
      startX: event.clientX,
      startY: event.clientY,
      groupTopAtStart: group.getBoundingClientRect().top,
      axis: null,
      lifted: false,
      liftTimer: undefined,
      offsetX: 0,
      groupOffsetY: 0,
      layoutTopAtStart: element.offsetTop,
      layoutTops: new Map(),
      order: itemElements(group).map(itemId),
      awaitingCommit: false,
      releasePending: false,
      samples: [],
    };
    measureLayout(gesture);
    gestureRef.current = gesture;

    // Listen on window rather than capturing on the handle: reordering moves
    // DOM nodes, and moving the capture target can silently drop capture.
    const { pointerId } = event;
    const controller = new AbortController();
    const { signal } = controller;

    function lockToReorder() {
      gesture.axis = "y";
      // Once a gesture reorders it can no longer swipe-to-delete.
      gesture.offsetX = 0;
      gesture.element.style.zIndex = "1";
    }

    if (event.pointerType === "touch") {
      gesture.liftTimer = window.setTimeout(() => {
        if (gestureRef.current !== gesture || gesture.axis) return;
        gesture.lifted = true;
        lockToReorder();
        applyTransform(gesture);
      }, LONG_PRESS_MS);
    }

    function onMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== pointerId || !groupRef.current) return;
      const dx = moveEvent.clientX - gesture.startX;
      const dy = moveEvent.clientY - gesture.startY;
      const groupTop = groupRef.current.getBoundingClientRect().top;
      const groupOffsetY =
        moveEvent.clientY - groupTop - (gesture.startY - gesture.groupTopAtStart);
      const self = gesture.layoutTops.get(gesture.id);
      const rowHeight = self ? self.bottom - self.top : 0;

      if (!gesture.axis) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= DIRECTION_LOCK_PX) {
          window.clearTimeout(gesture.liftTimer);
        }
        if (options.swipe && Math.abs(dx) >= DIRECTION_LOCK_PX && Math.abs(dx) > Math.abs(dy)) {
          gesture.axis = "x";
          gesture.element.style.zIndex = "1";
        }
      }

      // Reordering only starts a full row's travel away, so small vertical
      // drift (including during a swipe) never shuffles the list. Crossing
      // that line abandons any swipe in progress. An undecided touch never
      // reorders by travel alone: it needs the long-press, even where the
      // browser doesn't claim the pan (e.g. a list too short to scroll).
      const undecidedTouch = event.pointerType === "touch" && !gesture.axis;
      if (gesture.axis !== "y" && !undecidedTouch && Math.abs(dy) >= rowHeight) {
        lockToReorder();
      }

      const direction = Math.sign(groupOffsetY - gesture.groupOffsetY);
      if (gesture.axis === "x") gesture.offsetX = dx;
      gesture.groupOffsetY = groupOffsetY;
      gesture.samples.push({ time: moveEvent.timeStamp, x: dx });
      gesture.samples = gesture.samples.filter(
        (sample) => moveEvent.timeStamp - sample.time <= VELOCITY_WINDOW_MS,
      );

      applyTransform(gesture);
      if (gesture.axis === "y") maybeReorder(gesture, direction);
    }

    // The handle allows vertical panning so the list can scroll; once the
    // gesture is reordering or swiping, stop the browser taking it over.
    function onTouchMove(touchEvent: TouchEvent) {
      if (gesture.axis && touchEvent.cancelable) touchEvent.preventDefault();
    }

    function onEnd(endEvent: PointerEvent) {
      if (endEvent.pointerId !== pointerId) return;
      controller.abort();
      release(gesture, endEvent.type !== "pointerup", endEvent.timeStamp);
    }

    window.addEventListener("pointermove", onMove, { signal });
    window.addEventListener("pointerup", onEnd, { signal });
    window.addEventListener("pointercancel", onEnd, { signal });
    window.addEventListener("touchmove", onTouchMove, { signal, passive: false });
  }

  /** Animates a row's height and opacity to zero, resolving once it's gone. */
  async function collapse(element: HTMLElement) {
    removingRef.current.add(element);
    element.style.overflow = "hidden";
    await element.animate(
      [
        { height: `${element.offsetHeight}px`, opacity: 1 },
        { height: "0px", opacity: 0 },
      ],
      { duration: DISMISS_DURATION_MS, easing: "ease-out", fill: "forwards" },
    ).finished;
    snapshot();
  }

  useLayoutEffect(function syncDragListAfterCommit() {
    callbacksRef.current = { onReorder, onDragEnd };

    const group = groupRef.current;
    if (!group) return;

    const pending = snapshotRef.current;
    const changed = pending && pending.key !== orderKey(group);
    if (pending && (changed || performance.now() - pending.time > SNAPSHOT_TTL_MS)) {
      snapshotRef.current = null;
    }

    const gesture = gestureRef.current;
    const elements = itemElements(group);
    if (changed) {
      for (const element of elements) cancelFlip(element);
    }

    if (gesture) {
      measureLayout(gesture);
      gesture.awaitingCommit = false;
      applyTransform(gesture);
    }

    if (changed) {
      const groupTop = group.getBoundingClientRect().top;
      for (const element of elements) {
        if (element === gesture?.element) continue;
        const before = pending.tops.get(itemId(element));
        if (before === undefined) continue;
        const delta = before - (element.getBoundingClientRect().top - groupTop);
        if (Math.abs(delta) < 0.5) continue;
        element.animate([{ transform: `translateY(${delta}px)` }, { transform: "none" }], {
          ...LAYOUT_SPRING,
          id: FLIP_ANIMATION_ID,
        });
      }
    }

    if (gesture?.releasePending) {
      release(gesture, false, performance.now());
    }
  });

  return { groupRef, startDrag, collapse };
}
