/**
 * Finds free ports for the mock and app servers before starting Playwright,
 * so concurrent test runs (e.g. a run already in progress) never collide.
 */

import { spawnSync } from "node:child_process";
import { createServer } from "node:net";

const useDevServer =
	process.argv.includes("--dev") || process.argv.includes("-d");

function findFreePort(start) {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.on("error", (err) => {
			if (err.code === "EADDRINUSE") resolve(findFreePort(start + 1));
			else reject(err);
		});
		server.listen(start, "127.0.0.1", () => server.close(() => resolve(start)));
	});
}

const mockPort = await findFreePort(9001);
const appPort = await findFreePort(5174);

console.log(`[test:integration] mock :${mockPort}  app :${appPort}`);
console.log(`[test:integration] mode: ${useDevServer ? "dev" : "built"}`);

const playwrightArgs = process.argv
	.slice(2)
	.filter((arg) => arg !== "--dev" && arg !== "-d");

const result = spawnSync(
	"pnpm",
	["exec", "playwright", "test", ...playwrightArgs],
	{
		env: {
			...process.env,
			MOCK_SERVER_PORT: String(mockPort),
			APP_SERVER_PORT: String(appPort),
		},
		stdio: "inherit",
		shell: process.platform === "win32",
	},
);

process.exit(result.status ?? 1);
