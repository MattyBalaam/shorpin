import { sentryOnBuildEnd } from "@sentry/react-router";
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  future: {
    v8_middleware: true,
  },
  buildEnd: async ({ viteConfig, reactRouterConfig, buildManifest }) => {
    await sentryOnBuildEnd({
      viteConfig: viteConfig,
      reactRouterConfig: reactRouterConfig,
      buildManifest: buildManifest,
    });
  },
} satisfies Config;
