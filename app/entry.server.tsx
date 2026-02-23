import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";

import "./instrument.server.mjs";

// In preview builds, intercept all Supabase calls with MSW so the Netlify
// Function doesn't need a real Supabase project. Runs once on cold start;
// state persists for the lifetime of the warm function instance.
if (import.meta.env.MODE === "preview") {
	const { setupServer } = await import("msw/node");
	const { handlers } = await import("../mocks/handlers");
	const { seed } = await import("../mocks/seed");
	const { waitlist } = await import("../mocks/db");

	const server = setupServer(...handlers);
	server.listen({ onUnhandledRequest: "bypass" });

	await seed();
	await waitlist.create({
		id: "preview-waitlist-demo",
		email: "demo-pending@test.com",
		first_name: "Demo",
		last_name: "User",
		created_at: new Date().toISOString(),
	});
}

export default async function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	routerContext: EntryContext,
) {
	let shellRendered = false;
	const userAgent = request.headers.get("user-agent");

	const body = await renderToReadableStream(
		<ServerRouter context={routerContext} url={request.url} />,
		{
			onError(error: unknown) {
				responseStatusCode = 500;
				if (shellRendered) console.error(error);
			},
		},
	);

	shellRendered = true;

	if (userAgent && isbot(userAgent)) {
		await body.allReady;
	}

	responseHeaders.set("Content-Type", "text/html");
	return new Response(body, {
		headers: responseHeaders,
		status: responseStatusCode,
	});
}
