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
  (function poll() {
    fetch(location.href, { cache: 'no-store' })
      .then(function(r) {
        if (!r.ok) { setTimeout(poll, 200); return; }
        if (document.documentElement.dataset.hydratedPath) return;
        location.reload();
      })
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
