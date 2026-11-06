import { createFileRoute } from "@tanstack/solid-router";

// Where performance.browser.ts beacons web vitals and route timings. A
// server route (no page), like auth/confirm.ts: it logs slow metrics and
// always answers 204, so a bad payload never shows up as a client error.

type MetricKind = "web-vital" | "route-navigation";

type PerfMetric = {
  kind: MetricKind;
  name: string;
  value: number;
  unit: "ms" | "score";
  pathname: string;
  rating?: "good" | "needs-improvement" | "poor";
  ts?: number;
  details?: Record<string, unknown>;
};

const slowThresholds: Record<string, number> = {
  CLS: 0.1,
  FCP: 1800,
  INP: 200,
  LCP: 2500,
  TTFB: 800,
  "route-change": 1200,
};

function isPerfMetric(value: unknown): value is PerfMetric {
  if (!value || typeof value !== "object") {
    return false;
  }

  const metric = value as Record<string, unknown>;
  return (
    (metric.kind === "web-vital" || metric.kind === "route-navigation") &&
    typeof metric.name === "string" &&
    typeof metric.value === "number" &&
    Number.isFinite(metric.value) &&
    (metric.unit === "ms" || metric.unit === "score") &&
    typeof metric.pathname === "string"
  );
}

export const Route = createFileRoute("/perf")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response(null, { status: 204 });
        }

        if (!isPerfMetric(payload)) {
          return new Response(null, { status: 204 });
        }

        const threshold = slowThresholds[payload.name];
        const isSlow = threshold !== undefined && payload.value > threshold;

        if (isSlow) {
          console.warn("[Perf][slow]", {
            metric: payload,
            userAgent: request.headers.get("user-agent"),
          });
        }

        return new Response(null, { status: 204 });
      },
      // Start answers other methods with a 405 itself; GET is spelt out to
      // match the React Router loader.
      GET: () => new Response("Method not allowed", { status: 405 }),
    },
  },
});
