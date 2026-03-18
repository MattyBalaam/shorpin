type Rating = "good" | "needs-improvement" | "poor";

type PerfMetricPayload = {
  kind: "web-vital" | "route-navigation";
  name: string;
  value: number;
  unit: "ms" | "score";
  pathname: string;
  rating?: Rating;
  ts: number;
  details?: Record<string, unknown>;
};

const perfEndpoint = "/perf";
const isPerfTelemetryEnabled = !import.meta.env.DEV;
let didInitWebVitals = false;

function toRating(name: string, value: number): Rating | undefined {
  if (name === "LCP") {
    return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
  }
  if (name === "INP") {
    return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
  }
  if (name === "CLS") {
    return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
  }
  if (name === "FCP") {
    return value <= 1800 ? "good" : value <= 3000 ? "needs-improvement" : "poor";
  }
  if (name === "TTFB") {
    return value <= 800 ? "good" : value <= 1800 ? "needs-improvement" : "poor";
  }

  return undefined;
}

function sendMetric(metric: PerfMetricPayload) {
  if (!isPerfTelemetryEnabled) {
    return;
  }

  const body = JSON.stringify(metric);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(perfEndpoint, blob)) {
      return;
    }
  }

  void fetch(perfEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Ignore telemetry failures.
  });
}

function reportWebVital(name: string, value: number, details?: Record<string, unknown>) {
  if (!Number.isFinite(value)) {
    return;
  }

  sendMetric({
    kind: "web-vital",
    name,
    value,
    unit: name === "CLS" ? "score" : "ms",
    pathname: window.location.pathname,
    rating: toRating(name, value),
    ts: Date.now(),
    details,
  });
}

function onPageHidden(callback: () => void) {
  const handler = () => {
    if (document.visibilityState === "hidden") {
      callback();
    }
  };

  document.addEventListener("visibilitychange", handler, true);
  window.addEventListener("pagehide", callback, { once: true });
}

export function initWebVitalsTracking() {
  if (!isPerfTelemetryEnabled || didInitWebVitals || typeof window === "undefined") {
    return;
  }
  didInitWebVitals = true;

  const navEntry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;

  if (navEntry) {
    reportWebVital("TTFB", navEntry.responseStart, {
      domInteractive: Math.round(navEntry.domInteractive),
      domComplete: Math.round(navEntry.domComplete),
    });
  }

  const fcpEntry = performance.getEntriesByName("first-contentful-paint")[0];
  if (fcpEntry) {
    reportWebVital("FCP", fcpEntry.startTime);
  } else if (PerformanceObserver.supportedEntryTypes.includes("paint")) {
    const fcpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          reportWebVital("FCP", entry.startTime);
          fcpObserver.disconnect();
          return;
        }
      }
    });
    fcpObserver.observe({ type: "paint", buffered: true });
  }

  if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) {
    let lcp = 0;
    let lcpElement: string | null = null;
    const lcpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const lcpEntry = entry as PerformanceEntry & {
          element?: Element | null;
        };
        lcp = entry.startTime;
        lcpElement = lcpEntry.element?.tagName ?? null;
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    onPageHidden(() => {
      lcpObserver.disconnect();
      if (lcp > 0) {
        reportWebVital("LCP", lcp, { element: lcpElement });
      }
    });
  }

  if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
    let cls = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const layoutShift = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };
        if (!layoutShift.hadRecentInput) {
          cls += layoutShift.value ?? 0;
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
    onPageHidden(() => {
      clsObserver.disconnect();
      reportWebVital("CLS", cls);
    });
  }

  if (PerformanceObserver.supportedEntryTypes.includes("event")) {
    let inp = 0;
    let eventTarget: string | null = null;
    const inpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const eventEntry = entry as PerformanceEntry & {
          duration?: number;
          interactionId?: number;
          target?: EventTarget | null;
        };

        if ((eventEntry.interactionId ?? 0) <= 0) {
          continue;
        }

        if ((eventEntry.duration ?? 0) > inp) {
          inp = eventEntry.duration ?? 0;
          eventTarget =
            eventEntry.target instanceof Element ? eventEntry.target.tagName.toLowerCase() : null;
        }
      }
    });
    inpObserver.observe({
      type: "event",
      buffered: true,
      durationThreshold: 40,
    } as PerformanceObserverInit);
    onPageHidden(() => {
      inpObserver.disconnect();
      if (inp > 0) {
        reportWebVital("INP", inp, { target: eventTarget });
      }
    });
  }
}

export function reportRouteNavigationMetric(payload: {
  pathname: string;
  durationMs: number;
  fromPathname: string;
}) {
  const routeRating: Rating =
    payload.durationMs <= 600 ? "good" : payload.durationMs <= 1200 ? "needs-improvement" : "poor";

  sendMetric({
    kind: "route-navigation",
    name: "route-change",
    value: payload.durationMs,
    unit: "ms",
    pathname: payload.pathname,
    rating: routeRating,
    ts: Date.now(),
    details: { fromPathname: payload.fromPathname },
  });
}
