import type { Route } from "./+types/perf";

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

export async function action({ request }: Route.ActionArgs) {
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
}

export function loader() {
  return new Response("Method not allowed", { status: 405 });
}
