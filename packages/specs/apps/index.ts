import { reactRouter } from "./react-router.ts";
import type { AppAdapter } from "./types.ts";

export type { AppAdapter, RequestMatcher } from "./types.ts";

/** Every app the shared specs run against, by the name `APP` takes. */
export const apps = {
  "react-router": reactRouter,
} satisfies Record<string, AppAdapter>;

export type AppName = keyof typeof apps;

function isAppName(name: string): name is AppName {
  return Object.hasOwn(apps, name);
}

/** The app under test: `APP=<name>`, React Router by default. */
export const appName: AppName = (() => {
  const name = process.env.APP ?? "react-router";
  if (!isAppName(name)) {
    throw new Error(`Unknown APP "${name}". Expected one of: ${Object.keys(apps).join(", ")}`);
  }
  return name;
})();

export const app: AppAdapter = apps[appName];
