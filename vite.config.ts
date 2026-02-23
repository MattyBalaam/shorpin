import netlify from "@netlify/vite-plugin";
import netlifyReactRouter from "@netlify/vite-plugin-react-router";
import { reactRouter } from "@react-router/dev/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { reactRouterDevTools } from "react-router-devtools";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => ({
	server: {
		host: true,
	},
	// Bundle mock packages into the SSR function for preview builds so they are
	// available at runtime without requiring devDependencies to be installed.
	...(mode === "preview" && {
		ssr: { noExternal: ["msw", "@msw/data", "valibot"] },
	}),
	plugins: [
		devtoolsJson(),
		// reactRouterDevTools(),
		vanillaExtractPlugin(),
		reactRouter(),
		netlifyReactRouter(),
		netlify(),
		tsconfigPaths(),
		sentryVitePlugin({
			org: process.env.SENTRY_ORG,
			project: "shorpin",
			sourcemaps: {
				assets: "./build/**",
			},
		}),
		...(mode === "analyse"
			? [
					visualizer({
						open: true,
						filename: "dist/stats.html",
						gzipSize: true,
						brotliSize: true,
					}),
				]
			: []),
	],
}));
