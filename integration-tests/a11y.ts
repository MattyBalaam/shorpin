import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

type AxeViolations = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"];

function formatViolations(violations: AxeViolations) {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .slice(0, 5)
        .map((node) => `  - ${node.target.join(" ")}`)
        .join("\n");

      return `${violation.impact ?? "unknown"}: ${violation.id}\n${violation.help}\n${nodes}`;
    })
    .join("\n\n");
}

export async function getSeriousOrCriticalViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

  return results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
}

export async function expectNoUnexpectedA11yViolations(
  page: Page,
  options: { allowedRuleIds: string[] },
) {
  const violations = await getSeriousOrCriticalViolations(page);

  const unexpected = violations.filter(
    (violation) => !options.allowedRuleIds.includes(violation.id),
  );

  expect(unexpected, formatViolations(unexpected)).toEqual([]);
}
