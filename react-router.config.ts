import { sentryOnBuildEnd } from "@sentry/react-router";
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // React Router 8.3.1+ rejects action (POST) requests whose `Origin` header
  // doesn't match the origin of `request.url`. Behind the Coolify/Traefik TLS
  // proxy the app server builds `request.url` as `http://…` (react-router-serve
  // doesn't honour `X-Forwarded-Proto`), so the browser's `https://…` Origin
  // never matches and every list mutation 400s. Allow-list the public host(s)
  // here; the custom server that trusts the proxy (see README "Deployment")
  // makes this redundant but harmless. Supports micromatch globs (`*`, `**`).
  allowedActionOrigins: ["shorpin.matthewbalaam.co.uk"],
  buildEnd: async ({ viteConfig, reactRouterConfig, buildManifest }) => {
    await sentryOnBuildEnd({
      viteConfig: viteConfig,
      reactRouterConfig: reactRouterConfig,
      buildManifest: buildManifest,
    });
  },
} satisfies Config;
