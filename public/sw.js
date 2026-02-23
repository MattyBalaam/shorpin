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
    body { display: flex; align-items: center; justify-content: center }
    .spinner {
      width: 2rem; height: 2rem; border-radius: 50%;
      border: 3px solid rgba(0,0,0,.15);
      border-top-color: rgba(0,0,0,.45);
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg) } }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <script>
  // Poll for the real page to load. When it does, reload once to let React
  // hydrate. This handles the cold-start case where Netlify Functions take
  // time to boot — the user sees a spinner while waiting, then the real page.
  (function poll() {
    fetch(location.href, { cache: 'no-store' })
      .then(function(r) {
        // Server still booting, keep polling
        if (!r.ok) { setTimeout(poll, 200); return; }

        // Real HTML arrived
        if (document.readyState === 'complete') {
          // Already hydrated, nothing to do
          if (document.documentElement.dataset.hydratedPath) return;
          // Not yet hydrated — reload once to let React take over
          setTimeout(function() { location.replace(location.href); }, 100);
          return;
        }

        // Wait for HTML to fully parse, then reload for hydration
        document.addEventListener('DOMContentLoaded', function onDCL() {
          document.removeEventListener('DOMContentLoaded', onDCL);
          setTimeout(function() { location.replace(location.href); }, 100);
        });
      })
      // Network error, keep polling
      .catch(function() { setTimeout(poll, 200); });
  })();
</script>
</body>
</html>`;

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  // For form submissions (POST etc.) pass the request straight through with
  // manual redirect handling so the browser follows any server-side redirect
  // (e.g. redirectWithSuccess → /lists/groceries) without the SW interfering.
  // This preserves progressive enhancement: the action works even before React
  // has hydrated the page.
  if (event.request.method !== "GET") {
    event.respondWith(fetch(event.request, { redirect: "manual" }));
    return;
  }

  event.respondWith(
    Promise.race([
      fetch(event.request),
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(
            new Response(LOADING_PAGE, {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }),
          );
        }, 500);
      }),
    ]),
  );
});
