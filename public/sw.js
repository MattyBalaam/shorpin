self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));

const LOADING_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#A9CBB7">
  <title>Shorpin</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0 }
    html, body { height: 100dvh; background: #A9CBB7 }
    body { display: flex; align-items: center; justify-content: center; font-family: system-ui, sans-serif }
    .spinner {
      width: 2rem; height: 2rem; border-radius: 50%;
      border: 3px solid rgba(0,0,0,.15);
      border-top-color: rgba(0,0,0,.45);
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg) } }
    .error { display: none; text-align: center; color: rgba(0,0,0,.7) }
    .error p { margin-bottom: 1rem; font-size: .9rem }
    .error button {
      padding: .5rem 1.25rem; border: none; border-radius: 6px;
      background: rgba(0,0,0,.15); cursor: pointer; font-size: .9rem;
    }
    .error button:hover { background: rgba(0,0,0,.25) }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <div class="error">
    <p>Taking longer than expected to start.</p>
    <button id="retry">Try again</button>
  </div>
  <script>
  // Poll for the real page to load. When it does, navigate to the same URL so
  // the SW can serve the real HTML and React can hydrate. This handles the
  // cold-start case where Netlify Functions take time to boot.
  const MAX_ATTEMPTS = 30; // ~6 seconds at 200ms intervals
  let attempts = 0;

  const poll = () => {
    if (attempts >= MAX_ATTEMPTS) {
      document.querySelector('.spinner').style.display = 'none';
      document.querySelector('.error').style.display = 'block';
      return;
    }
    attempts++;
    // X-SW-Poll header tells the server this is a readiness probe (keeps URLs clean)
    fetch(location.href, { cache: 'no-store', headers: { 'X-SW-Poll': '1' } })
      .then((r) => r.ok ? location.replace(location.href) : setTimeout(poll, 200))
      .catch(() => setTimeout(poll, 200));
  };

  document.querySelector('#retry').addEventListener('click', () => location.replace(location.href));

  poll();
  </script>
</body>
</html>`;

const AUTH_PATHS = [
	"/sign-ups",
	"/logout",
	"/forgot-password",
	"/auth/confirm",
	"/auth/set-password",
	"/auth/request-access",
];

const isAuthRoute = (url) => AUTH_PATHS.some((path) => url.pathname === path);

self.addEventListener("fetch", (event) => {
	if (event.request.mode !== "navigate") return;

	const url = new URL(event.request.url);
	if (isAuthRoute(url)) return;

	// For form submissions (POST etc.) pass the request straight through with
	// manual redirect handling so the browser follows any server-side redirect
	// (e.g. redirectWithSuccess → /lists/groceries) without the SW interfering.
	// This preserves progressive enhancement: the action works even before React
	// has hydrated the page.
	if (event.request.method !== "GET") {
		event.respondWith(fetch(event.request, { redirect: "manual" }));
		return;
	}

	// Skip the splash for same-URL navigations: this covers (1) page reloads
	// (F5) and (2) the location.replace(location.href) the loading page fires
	// after its readiness poll succeeds. Both would loop back through this handler
	// if we served the splash again. React Router's own loading states handle
	// client-side navigations — those never trigger a SW fetch event at all.
	if (event.request.referrer && event.request.referrer === event.request.url) {
		return;
	}

	event.respondWith(
		new Promise((resolve) => {
			const controller = new AbortController();

			const timer = setTimeout(() => {
				controller.abort();
				resolve(
					new Response(LOADING_PAGE, {
						headers: { "Content-Type": "text/html; charset=utf-8" },
					}),
				);
			}, 500);

			fetch(event.request, { signal: controller.signal })
				.then((r) => {
					clearTimeout(timer);
					resolve(r);
				})
				.catch(() => {
					/* aborted or network error — timer will resolve */
				});
		}),
	);
});
