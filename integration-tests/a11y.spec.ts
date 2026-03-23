import { expectNoUnexpectedA11yViolations } from "./a11y";
import { test } from "./fixtures";
import { login } from "./helpers";

type RouteCheck = {
  name: string;
  path: string;
  user?: "owner" | "collab";
  allowedRuleIds: string[];
};

const routes: RouteCheck[] = [
  // Route-level allowlists keep existing issues visible while failing on regressions.
  { name: "login", path: "/login", allowedRuleIds: ["color-contrast"] },
  { name: "forgot password", path: "/forgot-password", allowedRuleIds: [] },
  { name: "request access", path: "/request-access", allowedRuleIds: [] },
  {
    name: "home",
    path: "/",
    user: "owner",
    allowedRuleIds: ["aria-required-children", "button-name", "color-contrast", "list"],
  },
  {
    name: "list",
    path: "/lists/shopping",
    user: "owner",
    allowedRuleIds: ["color-contrast"],
  },
  {
    name: "list config",
    path: "/config/shopping",
    user: "owner",
    allowedRuleIds: ["color-contrast"],
  },
  {
    name: "confirm delete",
    path: "/lists/shopping/confirm-delete",
    user: "owner",
    allowedRuleIds: ["color-contrast"],
  },
  { name: "sign ups", path: "/sign-ups", user: "owner", allowedRuleIds: [] },
];

for (const route of routes) {
  test(`a11y: ${route.name}`, async ({ page, ctx }) => {
    if (route.user === "owner") {
      await login(page, ctx.ownerEmail);
    }

    if (route.user === "collab") {
      await login(page, ctx.collabEmail);
    }

    await page.goto(route.path);
    await expectNoUnexpectedA11yViolations(page, {
      allowedRuleIds: route.allowedRuleIds,
    });
  });
}
