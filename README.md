A todo style app built with TanStack Start and Solid, server-rendered. Originally running on Netlify, but now using Coolify.

This is partly for me and my friends to use (product need), but also for me to grow my skills using Agentic AI to assist the build - for now mostly Claude Code.

- **Framework**: TanStack Start 2 (RC) with Solid 2 (RC), server-rendered — migrating from React Router v8 + React, see [Migration](#migration-to-tanstack-start--solid)
- **Language**: TypeScript
- **Styling**: Vanilla Extract CSS-in-JS
- **Build Tool**: Vite, with Nitro building the Node server
- **Testing**: Playwright with accessibility testing
- **Package Manager**: pnpm

## Docs

- [CONTRIBUTING.md](CONTRIBUTING.md) — TypeScript, React, and testing conventions
- [integration-tests/README.md](integration-tests/README.md) — running integration tests, architecture, CI
- [e2e/README.md](e2e/README.md) — running e2e tests against real Supabase
- [docs/mocking.md](docs/mocking.md) — mock server and MSW strategy

## Environment Files

Vite loads `.env.<mode>` for whatever `--mode` a script passes (falling back to plain `.env` for anything the mode file doesn't set). Each file below only matters for the commands that use its mode — you don't need all of them at once.

| File                                                    | Mode      | Used by                                         | Notes                                                                                                                   |
| ------------------------------------------------------- | --------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `.env.mock`                                             | `mock`    | `pnpm dev`, `pnpm test:integration`             | Points at the local mock server (`mocks/server.ts`); checked in, no setup needed — this is the default day-to-day loop. |
| `.env.preview`                                          | `preview` | `pnpm build:preview`                            | Placeholder Supabase values for preview/deploy-preview builds where the mock server isn't running.                      |
| `.env.test.local` (copy from `.env.test.local.example`) | `test`    | `pnpm dev:e2e`, `pnpm test:e2e`                 | Your own **test** Supabase project's real credentials (gitignored). Full details in [e2e/README.md](e2e/README.md).     |
| `.env` (copy from `.env.example`)                       | none set  | `pnpm dev:supabase`, `pnpm build`, `pnpm start` | Real Supabase project credentials for running against an actual backend instead of mocks, or for production.            |

`.env.mock`/`.env.preview` are checked into the repo (no real secrets, just enough to point at a mock/placeholder backend). `.env` and `.env.test.local` are gitignored — copy the matching `.example` file and fill in real values from your Supabase project's **Settings → API** page.

## Development Workflow

- Run `pnpm verify` before opening a PR or asking an agent to commit. It applies formatting, runs lint, runs typecheck, then confirms formatting is clean with `pnpm fmt:check`.
- `pnpm install` runs `prepare`, which installs a repo-managed Git pre-commit hook from `.githooks/pre-commit` into `.git/hooks/pre-commit` when possible.
- The installer will not overwrite a non-Shorpin custom pre-commit hook; if you already have one, merge in `pnpm verify` manually.
- CI uses the same `pnpm verify` command so local checks and pull-request checks stay aligned.

## Migration to TanStack Start + Solid

In progress, on the `spike/tanstack-solid` branch, to learn both. The list page (with its palette picker and Style link), the layouts, the dev login, home, and the dialogs and styles (list config, delete, the style dialogs, app styles and the colour-scheme toggle) are ported. Code still to port stays unchanged in [legacy/](legacy/), excluded from the build and checks, with what's left listed in [legacy/README.md](legacy/README.md). Specs for those features are `test.fixme`, each naming the stage that brings it back. Some sections below still describe the React version; each is rewritten as its feature is ported.

Decisions so far:

- **Latest of everything, including pre-releases:** Solid 2 RC, `@tanstack/solid-start` 2 RC, `@solidjs/vite-plugin` 3 (next), and Formisch's Solid 2 build (`@formisch/solid/v2`; the package's main entry still targets Solid 1).
- **Route config, not file-based routing:** [src/routes.ts](src/routes.ts) is TanStack Router's virtual route config, the same shape as React Router's `routes.ts`. Route modules sit beside their helpers (`data.ts`, `*.css.ts`), which file-based routing would treat as routes.
- **Server functions replace loaders and actions:** each route's data lives in a `*.functions.ts` module (Start's convention: importable from the client, which gets an RPC stub). `*.server.ts` stays for server-only helpers, which Start's import protection keeps out of the client.
- **Auth sits on the data:** `authMiddleware` ([supabase.middleware.ts](src/lib/supabase.middleware.ts)) wraps every server function that touches a user's data and redirects to `/login` without a session. React Router's request middleware with a public-route allowlist is gone: a server function is its own endpoint, so it must check for itself.
- **Isomorphic loaders replace `clientLoader`:** a TanStack Router loader runs on the server for the first page load, then in the browser on client navigations. The list's loader falls back to its IndexedDB snapshot there, and an effect caches what the server sent (which `clientLoader.hydrate` used to do).
- **`.client.ts` imports are mocked on the server** (`importProtection.behavior: "mock"` in [vite.config.ts](vite.config.ts)), matching React Router's rule that such modules are empty there. Calling a mocked export still throws.
- **Client-only modules: `*.browser.ts`.** A `.client` mock that's still referenced after tree-shaking logs an "Import denied in server environment" warning in the server build, and route modules always reference what they import (effects and handlers ship to the server too). So browser-only helpers are `*.browser.ts` modules that wrap each export in `createClientOnlyFn` where it's defined (`export const getListSnapshot = createClientOnlyFn(async function getListSnapshot(…) {…})`). On the server each export compiles to a stub that throws, the module's browser code (and the `.client` modules only it uses) drops out of the bundle, and consumers import it like any other module. Their top level must stay free of browser APIs, since it does run on the server. A module that needs the browser at its top level, like `supabase.client.ts` (it builds its realtime client on import), stays `.client` and is imported lazily through `createClientOnlyFn(() => import("…"))`. The server build should log no import-protection warnings, so a new one means an unwrapped import.
- **Readable server function ids** (`list.functions--mutateList…`) through `generateFunctionId`, so DevTools and tests can tell requests apart. Specs match requests through helpers in [integration-tests/helpers.ts](integration-tests/helpers.ts) rather than the framework's wire format.
- **No single-flight mutations:** by default, Solid's server function client sends `X-Single-Flight` with every POST. The server then re-runs the current page's loaders in the same request, and the router applies their data as fresh loader data. That resets pages that keep local state in writable derived signals. The re-run also misses cookies the mutation set (a star reverted), and the list page would count it as a visit, which records a view and clears unread markers too soon. [router.tsx](src/router.tsx) removes the header in `prepareRequest`. Pages apply their own results, and call `router.invalidate()` when they want fresh data.
- **Dialogs are child routes:** each has its own URL and renders in its parent's `<Outlet />`, as in React Router. Home is a pathless layout (`_home`) with an empty index route for `/`, because a `/` route with children is itself pathless and leaves nothing to match `/`. The list route keeps its own path, so `/lists/$list` still matches it with no index.
- **No flash toasts on redirects:** React Router's `redirectWithError`/`redirectWithSuccess` flashed a message through a cookie. Server functions return `{ ok: false, error }` instead, and the page shows the toast and navigates. Loaders that bounce to home (config and delete for someone else's list) only toast in the browser: the toast store is module state, which the server shares between requests.
- **The root loader re-runs on every navigation** (`shouldReload: true`): router-core only reloads a match that stays on screen when it's invalidated, so the root would otherwise keep the style cookie it read at startup, even through a sign-out. In the browser it only reads `document.cookie`.
- **Tests wait for a rendered route:** `data-hydrated-path` follows the router's resolved location, not `useLocation`, which changes as soon as a navigation starts. After signing in, `login()` also waits for home's view transition and the notification panel to finish animating. Until the view transition ends, pointer input lands on its snapshot.
- **No Conform:** the list page holds its state in two signals (confirmed server items, and what's on screen) and saves through one server function, one save at a time. See [List Mutations](#list-mutations-adddelete).
- **Solid 2 gotchas met so far:**
  - Reading a JSX prop builds its elements: read it once (`children()`), or keep data as data and build JSX in the template, or hydration can't match the server's HTML.
  - `onSettled` throws on any return value but a cleanup function, including the Promise Chromium's `scrollIntoView` now returns.
  - Attributes are written as named: `stroke-width`, not `strokeWidth`; `aria-hidden="true"`, since a bare boolean renders empty.
  - Writes are batched: a signal read straight after its setter returns the old value until the batch flushes.
  - `For` passes each item as a plain value (only the index is an accessor).
- **Editing `src/routes.ts` needs a dev server restart:** the router plugin loads the virtual route config once per process and keeps rewriting `routeTree.gen.ts` from that copy. Touching `vite.config.ts` doesn't reload it.
- **Lint:** oxlint's `no-unassigned-vars` is off, because it can't see Solid's compiler assigning `ref={el}` variables.

## Architecture

### Routing Structure

Routes are declared in [src/routes.ts](src/routes.ts) (TanStack Router's virtual route config), and [src/routeTree.gen.ts](src/routeTree.gen.ts) is generated from it on every dev or build run:

```
/login                                → src/routes/auth/login.dev.tsx
/ (home)                              → src/routes/home/home.tsx (layout) + index.tsx
/style                                → src/routes/home/style.tsx (dialog over home)
/config/$list                         → src/routes/list/config.tsx (dialog over home)
/lists/$list                          → src/routes/list/list.tsx
/lists/$list/style                    → src/routes/list/style.tsx (dialog over the list)
/lists/$list/confirm-delete           → src/routes/delete.tsx
```

**Route Hierarchy:**

- Root Layout: [src/root.tsx](src/root.tsx) - The document shell (`shellComponent`) and main container (max-width: 60ch). The auth and app layouts add notifications; pages render their own header with breadcrumbs
- Flat routing structure, with dialogs (style, config) nested one level under the page they open over
- Dynamic route parameter `$list` maps to list slugs in the database

**Data Loading:**

- Loaders call server functions (Supabase queries), on the server for the first load and from the browser after
- Real-time updates via Supabase broadcast channels, which refetch with `router.invalidate()`
- Mutations are server functions called from event handlers, with the page's own signals as optimistic state
- List item mutations are consolidated into a single Supabase RPC (`public.mutate_list`) to keep add/edit/reorder/delete/undelete, deleted-item pruning, and list view timestamp writes transactional

### UI & Layout Patterns

**Root Layout** ([app/root.tsx](app/root.tsx)):

- Single `<main>` container with centered max-width
- Page header with the breadcrumbs and the page's actions (see [Page header](#page-header))
- Notification panel under the breadcrumbs (see [Notifications](#notifications))

**On-screen keyboard sizing:**

The layout is a fixed-height app shell, so it has to shrink above the on-screen keyboard to keep the add-item bar in view.

- The viewport meta sets `interactive-widget=resizes-content`, and `<main>` falls back to `height: 100%`, which follows the resized viewport. This is the CSS-only path and works in Chrome and Firefox on Android.
- iOS Safari doesn't support `interactive-widget` yet. It keeps the layout full-height and scrolls the page, which pushes the header off-screen and exposes blank space under the layout. As a temporary workaround, `trackKeyboardViewport` in [app/root.tsx](app/root.tsx) writes `visualViewport.height` to `--visual-viewport-height` and resets the scroll. Modal dialogs use it too, so they centre above the keyboard rather than behind it.
- **Remove the workaround once Safari ships `interactive-widget`.** WebKit added it in August 2026, and it's behind a flag in Safari Technology Preview 252. A monthly workflow ([safari-interactive-widget.yml](.github/workflows/safari-interactive-widget.yml), running [scripts/check-interactive-widget.mjs](scripts/check-interactive-widget.mjs)) checks MDN's browser-compat-data and opens an issue once iOS Safari ships it. It can also be run by hand from the Actions tab. Then delete the effect, drop the `var()`s in `root.css.ts` and `modal.css.ts` and confirm on a device.

**Top edge on iOS:**

`viewport-fit=cover` runs the page under the status bar, so `<main>` pads its top by `env(safe-area-inset-top)`. Since iOS 26/27, home-screen apps also get a progressive blur over the top edge, which reaches past the inset and blurs the header. No CSS property or meta tag turns it off. `theme-color` is ignored, and the status-bar style made no difference here: the app has always used `default`.

WebKit skips the blur when a `position: fixed` box with a background spans the top edge, and tints the status bar from that box instead. Reports put the threshold at about 6px tall, at least 80-90% of the width, and within 4px of the top. `statusBarBackdrop` in [app/root.css.ts](app/root.css.ts) is that box: a real element rendered first in `<body>` (pseudo-elements aren't sampled), at least 11px tall so WebKit reads its colour from style rather than sampling pixels, in `Canvas` to match the page. It only shows in standalone mode on iOS (`@supports (-webkit-touch-callout: none)`).

In standalone mode, `prefers-color-scheme` is frozen for the life of the process, so after an OS light/dark switch the status bar keeps its old colour until the app is relaunched. The rest of the page is frozen the same way, so they still match. Drop the strip once WebKit gives web apps control over the edge effect.

**Modal dialogs:**

Every dialog uses [Modal](src/components/modal/modal.tsx) and [modal.css.ts](src/components/modal/modal.css.ts): `dialog` > `content` > heading, `body`, `actions`. The dialog opens with `showModal()` once it's in the document (the server can't render the modal state), and every way of closing it (Close, Escape, the backdrop) navigates to `urlOnClose`. `Modal.Actions` is a native `<form method="dialog">`, so the content's own form sits in `Modal.Body` and `Modal.Submit` submits it by id. The open dialog is a flex column capped at the visible viewport and never scrolls itself. Only `body` scrolls (`Modal.Body` in route modals), so the heading and actions stay in view however long the content gets or however small the screen. `body` is padded and pulled back by the same amount so focus rings inside it aren't clipped by the scroll container. The open dialog's `display: flex` is set only under `[open]`, because setting it unconditionally would override the browser's hiding of a closed `<dialog>`.

**Scroll indicators:**

[ScrollArea](app/components/scroll-area/scroll-area.tsx) shows a soft shade on an edge only when there's more content past it. Each edge is a zero-height sticky strip with a shadow, at `opacity: 0` until shown, with a 150ms fade. The scroller is a `scroll-state` container, and `scroll-state(scrollable: top | bottom)` queries reveal the strips; no JS runs where those are supported. Browsers without them (WebKit, so iOS, and Firefox at the time of writing) get a fallback: `trackScrollEdges`, a ref callback on the scroller, mirrors the same state as `data-scrollable-top` / `data-scrollable-bottom` from scroll events and a `ResizeObserver` on the scroller and its content, and attribute selectors set the same opacity. Scroll-driven animations (`animation-timeline: scroll()`) were used before, but are deliberately not: one approach plus one fallback is simpler than layering two CSS mechanisms. Once every target browser has scroll-state queries, delete `trackScrollEdges` and the attribute selectors; nothing else depends on them.

**Component Structure:**

- Semantic HTML preferred (nav, ol, li elements)
- Forms use Formisch with valibot schemas (Conform on routes not yet ported)
- Reusable clickable elements with shared styles

### Styling Approach

**Vanilla Extract** (`@vanilla-extract/css`):

- All styles in `.css.ts` files (zero-runtime CSS-in-JS), with no plain `.css` files. Global rules use `globalStyle`.
- Theme system with CSS variables via [app/styles/theme.css.ts](app/styles/theme.css.ts); app styles are applied with `createGlobalTheme` (see "App styles" below)
- CSS layers for cascade control ([layers.css.ts](app/styles/layers.css.ts)): `reset`, then `app` (typography). Every global element rule sits in one of them, so any component class overrides it without extra specificity. Component styles stay unlayered.
- Per-variant values are `createVar`s that a shared base reads, composed with `style([...])`/`styleVariants`, rather than functions spread into each variant. See [clickable-element.css.ts](app/components/shared/clickable-element.css.ts).
- Container queries name their container with `createContainer`, so they can't match an unrelated ancestor container.

**Design Patterns:**

- CSS Grid with named grid lines for complex layouts
- Subgrid for nested alignment
- Flexbox for simpler layouts
- Logical properties (paddingInline, insetInline) for internationalization
- Shared `clickable` class for interactive elements

**CSS build target:** `build.cssTarget` in [vite.config.ts](vite.config.ts) names the latest major browsers. Vite's default "widely available" baseline predates `light-dark()`, so LightningCSS rewrote it into `--lightningcss-light`/`--lightningcss-dark` fallbacks. Those variables are only defined where it also rewrites a `color-scheme` declaration, and this app sets `color-scheme: dark` only inside a dark-mode media query. So in light mode every `light-dark()` colour computed as invalid. That's why `textOnPalette` used to fall back to white text on pale list rows. Keep the target at versions that support `light-dark()` and `@scope`, or both will be transpiled again.

**Default palette:** home, and any list without its own palette, use an "ocean sunset" pair from the palette generator: cyan `primary` and pink `secondary`, adapted for dark mode with `toAdaptiveCss` like list palettes. Home's list rows use `palette.surface`, a deep shade of the primary hue with white ink (`textOnSurface`) in both schemes. `chrome` stays a neutral grey for icons and secondary ink. Primary's hex (`#0fc1e5`) is repeated in the `theme-color` meta tag, the manifest and `offline.html`. The PWA icons and the manifest's `background_color` still use the original sage (`#A9CBB7`, see [pwa-assets.config.ts](pwa-assets.config.ts)), because the icon's near-white glyph needs a darker backdrop than the new cyan.

**Theme Variables:**

```typescript
vars.spacing.appMargin; // Consistent horizontal padding
vars.palette.primary; // Primary color
vars.palette.secondary; // Secondary color
```

**List Palettes:**

Per-list `primary`/`secondary` colours come from [src/lib/palette.ts](src/lib/palette.ts), a port of the OKLCH strategies in [delphitools' Palette Generator](https://delphi.tools/tools/palette-genny/) (0BSD). Clicking 🎨 picks a random strategy (colour-theory harmonies, moods, eras, nature, art/culture) and opens a preview dialog ([theme.tsx](src/components/theme/theme.tsx), [palette-preview.tsx](src/components/theme/palette-preview.tsx)) with a wireframe mockup of the light and dark result before it's applied — Shuffle re-rolls, "Use these colours" commits. `Theme.Button` keeps the candidate to itself and hands the confirmed pair to the list page, which holds the list's colours in a signal (reset by each loader result) and saves them with the list through `mutateList`, so every later save carries them too. Only the light colours are stored, as `oklch()` strings in `lists.theme_primary`/`theme_secondary`; lightness is remapped into OKLCH 0.65–0.85 (`BACKGROUND_L`) and chroma reduced to fit sRGB so black text stays legible on them. That band is deliberately not pushed lighter: max in-gamut chroma for warm/cool hues falls off sharply above ~L 0.75 (a colour can be light _or_ vivid, rarely both above that point), so 0.65–0.85 is chosen to stay closer to "vivid but readable" than "pastel" — even its darkest end keeps a worst-case ~5.5:1 contrast against black text, comfortably past WCAG AA's 4.5:1.

**Dark mode for palette colours:** rather than generating and storing a second dark pair, `toDarkModeCss` derives one from the stored light `oklch()` string: same hue, lightness remapped from `BACKGROUND_L` into a dark band (`DARK_BACKGROUND_L`, 0.35–0.48, chosen the same way — its lightest end keeps ≥5.8:1 contrast against white text), then chroma independently gamut-fit against a generous ceiling — _not_ scaled down from the light colour's own chroma, which is what keeps the dark variant vivid rather than washed toward grey. Older stored values that predate the OKLCH generator (plain `hsl()`) don't carry parseable L/c/h, so they fall back to `color-mix(in oklch, <light> 30%, black)`, a cruder but format-agnostic darkening. `Theme` injects both into a single custom property via `light-dark(<light>, <dark>)` (`toAdaptiveCss`), so it needs no `@media` query. `vars.palette.textOnPalette` (`light-dark(black, white)`) is the adaptive ink colour for anything painted directly on `primary`/`secondary`; it's deliberately a separate token from `vars.palette.text`, which stays a fixed `black` because it also backs fixed elements (e.g. the solid "Add" pill) that must not flip. `light-dark()` tracks the OS preference correctly here only because `color-scheme: dark` is set exclusively inside the existing `@media (prefers-color-scheme: dark)` block in [app.css](app/app.css) — never `light dark` unconditionally — so nothing else on the page (native form controls, the settings dialog, etc.) changes rendering as a side effect of this.

**Colour scheme (light/dark):** a button on home cycles Auto → Light → Dark ([color-scheme.tsx](src/components/color-scheme/color-scheme.tsx)). Auto follows the OS through the `prefers-color-scheme` rule in [reset.css.ts](src/styles/reset.css.ts). Light and Dark set `data-color-scheme` on `<html>`, and an attribute rule pins `color-scheme`, which every `light-dark()` colour and system colour (`Canvas`, `CanvasText`) follows. So dark-mode styling must use `light-dark()` rather than its own `prefers-color-scheme` media query, or it will ignore the pinned scheme. It's a device preference, not an account one, so it's stored only in a cookie (`shorpin-color-scheme`, which Auto expires). The root loader reads the cookie so `<html>` is server-rendered in the right scheme with no flash. The toggle writes `document.cookie` and a module-level signal that overrides the loader's value, so a change applies at once, even offline, without re-running a loader. Only the browser ever writes the signal (from a click), so the server, where module state is shared between requests, always reads the loader's value. It survives sign-out.

**App styles:**

Seven app-wide looks: Classic (the original), Minimal, User agent, Brutalist, GOV.UK, Y2K and MySpace, defined in [src/lib/app-style.ts](src/lib/app-style.ts). A style is separate from a list's palette. It changes type, shape, borders, shadows, focus treatment and surfaces. The "Style" link on home sets the account's style, and the one on a list page sets that list's override. Each opens a dialog route, `/style` and `/lists/$list/style`, in the same way as the config modal: a child route rendering `<StyleDialog>` ([style-dialog.tsx](src/components/app-style/style-dialog.tsx)). Save calls the route's server function, then navigates back to the parent and calls `router.invalidate()` so the loaders return the new style. Picking an option only moves the selection, and each option previews itself in miniature. Nothing applies until Save, and Cancel, Escape or a backdrop click go back without saving. Opening or closing the dialog keeps the list's match, so its loader doesn't run again. The refetch after Save comes from `router.invalidate()`, whose `stay` cause isn't counted as a visit.

- **Tokens, not overrides.** Everything a style can change is a `vars.style.*` custom property in [theme.css.ts](app/styles/theme.css.ts), with Classic as the default ([classic-style.ts](app/styles/classic-style.ts)). Components read those tokens. [app-styles.css.ts](app/styles/app-styles.css.ts) reassigns the whole group for each `[data-app-style="…"]`, using `assignVars` so TypeScript rejects a style that leaves a token out. Custom properties inherit, so the nearest attribute wins. That lets each picker option set its own attribute and preview real components in its style while the page uses another one.
- **Buttons come in four variants**, all in [clickable-element.css.ts](app/components/shared/clickable-element.css.ts), shared by `Button` and button-styled `Link`s: `primary` (palette-filled), `solid` (a bar's main action, such as Add, which needs to stand out on a palette-filled bar where `primary` would vanish), `outline` and `destructive`. Each style decides how they look through `vars.style` tokens (`control*`, `solid*`, `outlineBorder`), so components shouldn't override a button's colours, border or shape. Pass a variant, and keep any extra class to layout and sizing.
- **`initial` means "keep the component's own value".** A custom property set to `initial` is guaranteed-invalid, so `fallbackVar` falls back to a value each component chooses. Classic uses this with a `revert` fallback, which substitutes as the CSS keyword, so buttons keep the browser's own font and border while button-styled links keep none. The surface tokens (`controlBackground`, `barBackground`, `rowBackground`, `itemBackground` and their inks) use it to fall back to the palette.
- **Palette-filled or accent.** Classic, Brutalist, Y2K and MySpace paint bars, rows and buttons with the palette. Minimal, User agent and GOV.UK keep surfaces to the page's own colours (`Canvas`/`CanvasText`, so dark mode follows). They use the palette only as accents: a rule over the action bar in `primary`, list items divided in the list's `secondary`, badges and focus rings.
- **User agent can't be expressed in tokens.** A custom property can't hold "use the browser default". This style reverts the author styles on text and controls with `revert !important`, inside `@scope ([data-app-style="user-agent"]) to ([data-app-style]:not(…))`. The `!important` beats component classes and their `:hover`/`:focus` states. The scope limit stops it at a nested preview of another style.
- **Account style: `profiles.app_style`, cached in a cookie (`shorpin-style`).** NULL on the profile means Classic. The cookie lets the root loader render `<html>` in the right style with no lookup on most requests. Home's `getHome` always reads the profile too, returns it as `accountAppStyle`, and updates the cookie if it differs. When the cookie is missing on a server render (signed out, or the first request after signing in on a device), the root loader asks the profile through `getAccountAppStyle` ([app-style.functions.ts](src/lib/app-style.functions.ts)). Both set the cookie through [app-style.server.ts](src/lib/app-style.server.ts). Sign-out expires the cookie alongside the offline data it already clears, so signed-out pages, and the next person on a shared device, get the default.
  - **Saving** is online-only. `saveAccountStyle` updates the profile and re-issues the cookie, and the dialog goes home and invalidates, so the root loader and home's profile read both pick up the new style. Offline, or when the request fails, `StyleDialog` stays open with a toast.
  - **Other devices:** because home always reads the profile, a change made elsewhere shows up on the next visit home.
  - **Reading it:** `useAccountAppStyle` in [use-app-style.ts](src/components/app-style/use-app-style.ts) reads home's `accountAppStyle` when home is on screen, else the root loader's `appStyle` (the cookie).
- **List override: `lists.theme_style`** (NULL means the list follows each viewer's own style). Like the account style, saving is online-only: `saveListStyle` makes a direct update (any member may update the list), and the dialog goes back to the list and invalidates, so its loader returns the new value. Offline, it declines with a toast instead of queueing. It's never part of the list form, so a stale tab adding an item can't reset another member's choice. The list loader returns it as `appStyleOverride`, and root uses the deepest match carrying that key. `"inherit"` (`INHERIT_APP_STYLE`) clears the override. Values are validated in the app (`zSetListStyle` in [style.functions.ts](src/routes/list/style.functions.ts)), not by a CHECK constraint, so adding a style needs no migration. `mutate_list` still accepts a `themeStyle` payload key, but the app no longer sends it.

### Component Architecture

**Key Components:**

- [Link](app/components/link/link.tsx) - Wrapper around React Router Link with variant support
- [Button](app/components/button/button.tsx) - Styled button using clickable styles
- [Items](app/components/items.tsx) - Drag-to-reorder list with swipe-to-delete (see [Drag, reorder & swipe](#drag-reorder--swipe))
- [Item](app/components/item.tsx) - Individual list item with swipe-to-delete
- [Breadcrumbs](app/components/breadcrumbs/breadcrumbs.tsx) - Navigation breadcrumbs using route handles
- [PageHeader](app/components/page-header/page-header.tsx) - Breadcrumbs with the page's actions beside them (see [Page header](#page-header))

**Patterns to Follow:**

- Named functions in useEffect callbacks (see [CONTRIBUTING.md](CONTRIBUTING.md))
- Grid layouts with template areas and named grid lines
- Co-located styles using Vanilla Extract
- Formisch for form validation and state (Conform on routes not yet ported)

### List Mutations (Add/Delete)

The list page ([src/routes/list/list.tsx](src/routes/list/list.tsx)) keeps the list in two signals: `serverItems`, what the server last confirmed, and `items`, what's on screen. Both are writable derived signals that reset when the loader delivers new data. Every change (add, edit, delete, reorder, group by tag) sends the list's whole desired state to one server function, `mutateList` ([list.functions.ts](src/routes/list/list.functions.ts)), which calls the `mutate_list` RPC and returns the saved items:

- **Add** is a non-empty `new` (with a client-generated `newId`) alongside the current items. The RPC inserts whenever `new` is present.
- **Delete** is inferred server-side by diffing the submitted `items` against the database: any active row missing from it is marked deleted.
- **Saves run one at a time, in order**, so a slow response can never land after a newer save's and overwrite it. Only the newest save's response replaces what's on screen. (React Router got the same effect by cancelling the older navigation.)
- A row is removed by id once its exit animation ends. With no form fields indexed by position, nothing else gets renumbered meanwhile, which used to make the order of these steps matter.
- `edited` (the ✏️ marker) is every item whose value differs from `serverItems`.

**Editing:** item values are shown as plain text. The row's edit button (`Edit <text>`, the label tests and assistive tech find rows by) opens a `<dialog>` with a textarea and tag field; Save hands the new value to the page through `onEdit`.

**Tags:** an item can carry one tag. It's stored inside the value as a trailing `[tag]` (e.g. `Milk [dairy]`) rather than in its own column. So tags need no migration, and they ride along on every path that already carries a value: add, edit, undo-delete and offline replay. [item-tag.ts](app/lib/item-tag.ts) parses and formats them:

- Only the last bracket group, at the very end, counts. `Call [Sam] tomorrow` stays untagged, and a value that's only `[tag]` is shown as typed.
- Typing `text [tag]` in the add box tags the new item.
- The add bar also has a tag field: the same combobox as the edit dialog, so you can pick an existing tag or type a new one. The add folds its tag into the typed value as `[tag]`, so online adds, offline queueing and replay all carry it unchanged. A tag typed into the value wins. The tag is a signal rather than part of the input, so clearing the input after each add leaves it, and a run of items can share a tag until the page reloads. Enter in the tag field adds the item, like Enter in the item input.
- The edit dialog splits the value into an Item textarea and a Tag field, then joins them back on save. Brackets are stripped from the tag.
- The Tag field is a hybrid combobox ([tag-combobox.tsx](app/components/tag-combobox/tag-combobox.tsx), following the WAI-ARIA APG "list autocomplete" pattern).
  - Opening it by focus, click or the arrow keys lists every tag, with the current one ticked, like a select. Only typing filters, so a chosen tag doesn't narrow the list to itself.
  - A typed tag that doesn't exist yet is offered as `Add "…"`.
  - Arrow keys move through the options and Enter picks one. With nothing highlighted, Enter saves the dialog. Escape closes the list without closing the dialog.
- The listbox is a manual popover in the top layer, placed under the input with CSS anchor positioning (`flip-block` when there's no room below, as in the add bar). Each instance sets its own anchor name inline. With a shared name, the dialog's list could attach to the add bar's input. The dialog's scrolling body can't clip it, and opening or closing it never moves the dialog's contents, so it can simply close on blur. While open it can cover Save: pick a tag, press Escape or tap elsewhere first.
- The row shows the text, with the tag as a pill in its own grid column just before the edit button. Every row has an edit button, so tags line up on the right whatever else a row shows. Row labels (`Edit`, `Reorder`, `Delete`) use the text alone, so adding a tag doesn't rename a row.
- **Group by tag** (list header) reorders the list once and saves it the same way as a drag. The grouped order is the list's real order, shared with every member, rather than a local view. Each group sits where its first item was, and items keep their order inside a group. Untagged items count as a group, so grouping twice changes nothing. On narrow screens the button is icon-only so the header fits.

### Drag, reorder & swipe

Reorderable lists (list items, and home lists once ported) use a small in-house gesture controller, [create-drag-list.ts](src/components/reorderable/create-drag-list.ts), built on pointer events and the Web Animations API, instead of Motion. Motion added ~48 KB gzipped to every `/app` route (its `Reorder` components pull in the full feature set, so `LazyMotion` couldn't defer it); the hook is ~2 KB gzipped and covers exactly what the lists use:

- **Gesture intent:**
  - **Swipe:** a gesture becomes a swipe-to-delete once it moves 10px, mostly horizontally. This only applies where the row opts in via `swipe`.
  - **Reorder:** reordering only starts after a full row's vertical travel. Small drift never shuffles the list, and crossing that line cancels any swipe in progress, so the row can't be deleted.
  - **Touch scrolling:** on touch, the handle uses `touch-action: pan-y`, so a vertical thumb movement over it scrolls the list. To reorder on touch, long-press the handle (300ms) first. The row lifts and the hook cancels `touchmove` so the browser doesn't scroll.
- **Reorder** — a row swaps with its neighbour once its leading edge crosses the neighbour's centre. Layout is measured with `offsetTop`, which ignores transforms, so in-flight animations and the lifted scale never skew the thresholds. Pointer travel is measured relative to the list, so scrolling mid-drag keeps the row under the pointer.
- **Sibling animation (FLIP)** — before each reorder or removal the controller snapshots every row's position. A `MutationObserver` on the list reports the rows moving (after the DOM updates, before the next paint), and it animates each sibling from its old position to its new slot. React ran this after every commit; Solid has no commit to hook, and rows being added, removed or moved is all it needs.
- **Swipe-to-delete** — dismisses past 140px or above 500px/s (velocity over the last 100ms); otherwise springs back.
- **Springs** — sampled once into CSS `linear()` easings, so WAAPI plays them with no physics runtime.
- Gesture listeners attach to `window` rather than using pointer capture, because reordering moves DOM nodes, which can drop capture mid-drag.

[`createReorderable`](src/components/reorderable/create-reorderable.ts) holds the order while a drag is under way and hands the final order to the page, which saves it.

### Offline / Local-first (Home + List)

The home (`/`) and list (`/lists/:list`) routes work offline: reads are served from a local cache, writes queue locally and sync once reconnected, and the app shell itself boots from a service worker cache with zero network. Other routes (auth, sign-ups, config) are online-only — they have no local cache to fall back to, but still degrade gracefully rather than erroring raw; see "Error boundaries & network-down UX" below.

**Why not a service worker that fabricates `action` responses:** React Router 8's `.data` protocol encodes loader/action payloads with a vendored, unversioned `turbo-stream` serializer (`node_modules/react-router/dist/*/vendor/turbo-stream-v2/`), not JSON. A service worker hand-constructing that shape would be brittle against any React Router version bump and would duplicate logic that already works one layer up. Instead, offline handling lives in each route's `clientLoader`/`clientAction` — React Router's native extension point, which runs in JS _before_ any network request is attempted — backed by IndexedDB for durability across reloads. The service worker's job is narrower: precache the app shell/static assets, and act as a best-effort reliability backstop (via Background Sync) for draining the mutation queue.

**IndexedDB (`shorpin-offline`, v1)** — three object stores, accessed through `src/lib/offline-store.browser.ts`:

- `home-cache` — singleton snapshot of the lists-of-lists view, replacing what used to be a `localStorage` cache.
- `list-snapshots` (keyed by slug) — a `baseline` (last confirmed-from-server item state, frozen the moment the app goes offline) alongside `desired` (net local edits). Keeping both is what makes reconnect sync correct rather than just "replay the last thing we sent."
- `mutation-queue` — durable FIFO of queued submissions, serialized as `[key, value][]` pairs (not a plain object — `FormData` isn't structured-clone-safe, and some forms repeat a key, e.g. `list-order`, which an object would collapse).

A small hand-rolled promisifying wrapper (`app/lib/idb.client.ts`) is used instead of a dependency like `idb` — the schema is a single version with only get/put/cursor/index operations, well inside "the platform is fine here."

**Reconnect sync — why list mutations need a rebase, not a replay:** `list.server.ts`'s `action` calls a single Postgres RPC, `mutate_list`, which diffs the _entire submitted `items[]` array_ against live DB rows — anything active in the DB but missing from the submitted array gets soft-deleted. Blindly replaying a stale offline-queued snapshot is indistinguishable, server-side, from "the user deleted everything they didn't type" — so if another device adds an item while this one is offline, a naive replay would resurrect-delete it. To avoid that, reconnect first revalidates to get fresh server state, then computes a bounded three-way merge (`app/lib/offline-merge.ts`'s `rebaseListItems`, given `baseline`/`desired`/`fresh`): concurrent additions/edits by other devices survive by default; our own deletions and edits win only for the specific ids we touched; only our own reordering overrides relative order. The rebased result is submitted as a single POST — collapsing the whole offline session into one request. `mutate_list` is idempotent on final state for `items[]`, and offline additions carry their client-generated ids (see below), so delivering the same sync twice is harmless.

Home's list-reordering doesn't need this treatment: it updates `sort_order` per-row directly (no diff-against-submitted-array), so it structurally can't resurrect or delete anything — last-write-wins is correct there, not just simpler. List creation is append-only and already de-duplicates slugs server-side, so it just replays in order.

**Service worker (`app/sw.ts`, via `vite-plugin-pwa`'s `injectManifest` strategy):** precaches hashed static assets (`generateSW`/hand-rolling a precache list was ruled out — hashed chunk filenames change every build, so a hand-maintained list goes stale on the next deploy, which is exactly the kind of build-time problem the platform can't solve on its own). Navigation requests fall back to a static offline shell when the network is unavailable and nothing better is cached. Every POST and every `.data` GET passes straight through untouched — the service worker never participates in React Router's wire protocol. It also listens for a Background Sync event as a best-effort backstop for draining simple queued mutations (list creation, list reordering) even if the tab has closed; this has no effect on Safari/iOS, where the `online` event listener (already the primary sync trigger everywhere) remains the only mechanism.

**Updates wait for the user (`app/lib/service-worker.client.ts`):** a redeployed `sw.js` installs in the background and then _waits_ behind the current worker. `app/sw.ts` deliberately doesn't call `skipWaiting()` on install, so a tab never runs one build's JS under another build's worker. The page checks for a new build hourly and when the app returns to the foreground (at most every 15 minutes, since each check re-downloads `sw.js`). When one is waiting, the page shows a "A new version is available" toast. Its Reload action posts `SKIP_WAITING` to the waiting worker and reloads once that worker has taken control. A first-ever install has nothing to wait behind, so it activates straight away. The one exception is `version-guard.browser.ts`: when a mutation fails because the server is a newer build, it activates the new worker immediately (`applyUpdateNow`) and retries without prompting. This is built on the platform `ServiceWorkerRegistration` API rather than `vite-plugin-pwa`'s `useRegisterSW`, which would add `workbox-window` to the page bundle for the same behaviour.

**Runtime page cache (`shorpin-pages`, via Workbox `NetworkFirst`):** the IndexedDB caches above only serve offline reads to a tab that's already hydrated — a genuine fresh navigation (hard reload, cold open, new tab) while offline is a real browser navigation that the service worker intercepts, and until this cache existed it always fell back to the generic static `offline.html`, even when the user's actual list data was sitting right there in IndexedDB. Home and list navigations (and _only_ those two — see `isCacheablePageUrl` in `app/lib/page-cache.ts`) now go through a `NetworkFirst` strategy instead: always try the network first, and cache the successful response; only serve the cached copy when the network genuinely fails. `offline.html` remains the last-resort fallback for a page never visited. Bounded with Workbox's `ExpirationPlugin` (`maxEntries: 50`) so a long session doesn't grow it unbounded. Because this is cached _rendered HTML_ from an authenticated SSR route, it's per-user data — cleared on logout (`app/routes/auth/logout.tsx`) via `caches.delete("shorpin-pages")`, the same shared-device protection `clearAllOfflineData()` already gives the IndexedDB stores. Offline reads (from either cache) never re-verify auth — there's no network to check against — but every request made once back online goes through the normal Supabase auth middleware exactly as always; nothing about caching weakens that.

**Reconnect sync must only rebase onto genuinely fresh server state:** just after reconnecting, the fresh-data fetch can fail while the connection is still settling, yet the sync's save a moment later succeeds. The cached list predates anything other devices added meanwhile, so rebasing onto it would submit a snapshot that `mutate_list` reads as deleting those items. So the list page's `syncIfPending` calls `getList` itself and never falls back to the cache: on a network failure it retries with exponential backoff (1s doubling, capped at 30s) until it gets real server state. (The loader's cached fallbacks carry `fromCache: true`, so nothing mistakes them for fresh data.) `list.spec.ts`'s "a failed fresh-data fetch on reconnect…" test covers this.

**Reconnect sync must treat a redirected-away response as a failed delivery, not a success:** a stale/unrefreshable session makes `supabaseMiddleware` (`app/lib/supabase.middleware.ts`) throw a redirect to `/login` _before_ the route's action runs. The mutation-replay paths that use a raw `fetch()` (home's `onOnline` handler, the service worker's `drainSimpleMutations` Background Sync backstop) pass `redirect: "manual"` and check the response's `type`/`ok` before dequeuing — otherwise `fetch()` would silently follow the redirect, resolve "successfully" against the `/login` page, and the mutation would be dropped from the queue despite never having reached the actual action. List's rebase-and-resubmit sync calls server functions directly, so a redirect arrives as a thrown `redirect`: it follows it to `/login` and leaves the queue in place. Both home and list also retry a pending queue once on mount (not just on an `online` transition), so an edit left queued by a stale-session redirect actually gets flushed once the user re-authenticates and comes back, instead of sitting inert until another real connectivity blip happens to occur on that page.

**Offline additions keep their client-generated ids, so a replayed sync can't duplicate them:** the queue is only dropped once the sync's response arrives, so a reload or tab close while that request is in flight leaves an edit the server already applied still queued, and the next mount sends it again. The rebase handles that for `items[]` (the already-applied row is just "fresh" state), but additions travel separately in `newItems`. So each addition's offline id goes along in the parallel `newItemIds` array, and `mutate_list` uses it as the row id with `ON CONFLICT (id) DO NOTHING` (migration `20261011000000`). It's a parallel array rather than `{ id, value }` objects so either the client or the migration can deploy first: the older function simply ignores `newItemIds`.

**List edits queue on a failed request, not only when the browser reports offline:** `navigator.onLine` lags a dropped connection by several seconds on mobile, so the list page also falls back to the offline queue when a save fails with a network error or a server function reports its backend unavailable. That fallback can't know whether the server applied the request and only the response was lost. Edits, deletes and reorders are safe to send again because the sync rebases them onto fresh state. Adds are made safe by giving every add a client-generated `newId`; `list.functions.ts`'s `toIdempotentAdd` sends it to `mutate_list` as a `newItems`/`newItemIds` entry, so a replay hits `ON CONFLICT DO NOTHING`. A fallback-queued edit has no offline→online transition to trigger the sync, so the page starts the sync itself and lets its backoff wait for the server.

### App icons

Home-screen icons and the favicon are generated from one master image, `public/icons/icon.png`, by `@vite-pwa/assets-generator` (`pnpm generate-pwa-assets`, configured in [pwa-assets.config.ts](pwa-assets.config.ts)). The outputs are committed, and the manifest and `<head>` links are hand-maintained to match, because the manifest is a hand-written file and `<head>` is rendered by React Router, not by the plugin's HTML injection. The generator produces a **maskable** icon (glyph padded into Android's safe zone, on the theme colour) and an opaque `apple-touch-icon`, because iOS fills transparent touch icons with black. [pwa.spec.ts](integration-tests/pwa.spec.ts) checks the icons load and are opaque. The original export had its alpha scaled to ~6%, which made the installed icon nearly invisible.

### Default list on launch

Each list row on home has a ☆/★ toggle that picks the list the installed PWA opens into. The manifest's `start_url` is `/?launch`; home's loader always redirects that URL away — to the starred list if it still exists, otherwise to plain `/` — so later revalidations of home never re-trigger it. Existing installs must be removed and re-added once to pick up the new `start_url` (Safari's "Add to Dock" snapshots the manifest at install time, so the default can't be expressed by rewriting the manifest per user).

**iOS ignores `start_url`.** iOS home screen apps open at `/` (or wherever the page was when added), so `?launch` never arrives. The home `clientLoader` therefore also treats a load as a launch when the app is running standalone (`display-mode: standalone` or iOS's `navigator.standalone`), the document was opened fresh (`PerformanceNavigationTiming.type === "navigate"`, so not a pull-to-refresh reload) at `/`, and it's the first home load of that document (`src/lib/standalone-launch.browser.ts`). It then redirects to `/?launch` so the existing server/offline paths resolve the starred list. In-app navigation back to home is client-side and never counts. This also covers installs made before `start_url` changed, with no reinstall.
**Why a cookie, not a DB column:** "what opens when I click the Dock icon" is a per-device choice, and a cookie is readable by the server before render with no extra query or migration. It's set by the action via `Set-Cookie` (server-set cookies aren't subject to Safari's 7-day cap on script-writable storage), stored by list id (survives renames), and re-issued with a fresh 400-day `Max-Age` on every launch. It's deliberately not `HttpOnly`: offline, the home `clientLoader` reads `document.cookie` and performs the same redirect against the IndexedDB snapshot, and an offline star toggle writes `document.cookie` directly. The service worker's page cache strips the `launch` param from its cache key so an offline launch still finds the cached `/` HTML. Helpers live in `app/lib/default-list.ts`, built on React Router's `createCookie` — unsigned, because a signing secret can't ship to the client that reads it offline. (Supabase's auth cookies stay on `@supabase/ssr`'s parse/serialize: that library owns their format and chunking.)

### Error boundaries & network-down UX

Every route's error boundary funnels network/server failures through one shared check — `isNetworkOrServerError` (`app/lib/network-error.ts`): a `fetch()` that never got a response (`TypeError`), or a 5xx bubbled up as a route error response — and one shared presentational component, `ErrorState` (`app/components/error-state/`), instead of each boundary reinventing "is this a dead server or a real bug." Home and list use it directly for their own errors; `root.tsx`'s boundary checks it before falling into its generic "something went wrong" branch, so any route with no offline handling of its own (auth, `/sign-ups`, `/config/:list`) still shows a friendly, retryable message — not a raw `Failed to fetch` — when a client-side (SPA) navigation fails because the app's own server, not just the user's connection, is unreachable.

This is deliberately separate from the service worker's `offline.html` fallback above: the SW only intercepts full/hard navigations, never React Router's in-app `.data` fetches (see "Why not a service worker that fabricates `action` responses" above) — so SPA-navigation failures on routes outside the offline feature's scope had no graceful handling before this existed, regardless of whether the user was offline or the server was simply down. `ErrorState` also distinguishes the two cases via `navigator.onLine` ("You're offline." vs "Couldn't reach the server.") for messaging consistency with `offline.html`'s tone, without depending on `OnlineStatusProvider` (scoped to the authenticated app layout, and not necessarily mounted when an error boundary above it renders). Its "Cancel" action navigates back (or home, if there's no history), since home and list both have offline caches to land on.

**The root loader must never take down an offline-capable route.** The root loader revalidates on client navigations, and `root.tsx`'s offline `shouldRevalidate` guard only helps once `navigator.onLine` has flipped — on a real device there's a window where the connection is gone but the browser still reports online. A failed root fetch there would hit the root error boundary and replace home/list's cached data with the error modal. So `root.tsx` has a `clientLoader` that swallows network/5xx failures (its only payload is a flash toast). `isNetworkOrServerError` also matches each engine's fetch-failure wording (Safari's is "Load failed", which contains no "fetch").

### Authentication (Supabase)

The `/auth/confirm` route handles all Supabase email verification links. It exchanges the OTP token, then redirects:

- `type=recovery` or `type=invite` → `/set-password` (user sets a password)
- All other types (e.g. `signup`) → `/`

**Required Supabase dashboard configuration:**

In **Authentication → Email Templates**, update the link href for each template:

**Reset Password:**

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a>
```

**Invite User:**

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept Invite</a>
```

**Confirm Signup** (if email confirmation is enabled):

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
```

In **Authentication → URL Configuration**, add to **Redirect URLs**:

```
https://shorpin.matthewbalaam.co.uk/auth/confirm
https://shorpin.matthewbalaam.co.uk/set-password
```

Set **Site URL** to your deployment URL (e.g. `https://shorpin.matthewbalaam.co.uk`).

**Only a definitive auth failure logs the user out.** Access tokens last an hour, so the first request after a long offline spell always has to refresh the session server-side (`supabaseMiddleware`), and every loader calls `getUser()` (`requireUser`). Both used to redirect to `/login` on _any_ failure — including a network blip, timeout, 5xx or rate limit from Supabase auth, where supabase-js has deliberately left the session cookies intact. Those now throw a `503` instead (`isTransientAuthError` / `authUnavailable` in `app/lib/supabase.server.ts`); home and list clientLoaders already fall back to their IndexedDB copy on any 5xx, so the user stays on their data and the next request retries. Only rejections that mean the session is really gone (e.g. `refresh_token_already_used`, `session_not_found`) redirect. Every forced redirect, and every transient 503, is recorded via `Sentry.logger` with the auth error `code`/`status`, since the middleware's `console.log` lines don't reach Sentry.

### Database (Supabase)

**Available Scripts:**

- `pnpm db:push` - Push migrations to the database
- `pnpm db:migrate` - Run pending migrations
- `pnpm db:reset` - Reset database (destructive)

**Type Generation:**

No script configured. Generate types manually with:

```bash
pnpx supabase gen types typescript --local > app/lib/database.types.ts
```

**Schema:**

- `lists` - Shopping lists with name, slug, state, theme colors
- `list_items` - Items belonging to lists with value, state, sort_order

**Keep-Alive:**

The e2e Supabase project is on the free tier, which auto-pauses after ~7 days
without database activity. `.github/workflows/supabase-keepalive.yml` runs
daily (`pnpm keepalive:supabase`) and inserts then immediately deletes a
marker row (`keepalive@shorpin.invalid`) in `waitlist`. It has to be a write:
two earlier versions, an `/auth/v1/health` ping and a daily anon-keyed
`/rest/v1/lists` read, both returned 200 every day while Supabase kept sending
pause warnings. Writing needs `E2E_SUPABASE_SERVICE_ROLE_KEY` (anon can insert
into `waitlist` but not delete), scoped to the test project only, alongside
`E2E_SUPABASE_URL`. The run log prints the project ref so you can confirm
which project was hit.

### Visual snapshot tests

Each route's integration spec has a `@visual` test that screenshots the page with Playwright's `toHaveScreenshot`, next to that route's other tests. Two extra Playwright projects run only the `@visual` tests: `iphone-pro-max` (iPhone 17 Pro Max in WebKit) and `laptop` (1440×900 in Chromium). The `desktop` and `touch` projects skip them. See [integration-tests/README.md](integration-tests/README.md#visual-snapshots).

- **Local only for now.** Font rendering differs between operating systems, so the committed baselines (suffixed `-darwin`) only match on macOS. The visual projects are left out when `CI` is set. Running them in CI needs a pinned Docker image to generate and compare baselines in.
- **Per-test data the screenshots can rely on.** Each test's user emails come from a uuid derived from its test id, so they're the same on every run. The mock narrows users and waitlist entries to the requester's uuid ([mocks/scope.ts](mocks/scope.ts)), so modals that list "everyone" only show that test's data, even with tests running in parallel.

### WebKit behaviour tests

Integration tests run in Chromium (`desktop`), which hides some bugs real iPhones hit. For example, Chromium's scroll anchoring masks a scroll position clamped when the list briefly shrinks. Tag a test `@webkit` to also run it in the `webkit` project (iPhone 17 Pro Max in WebKit). Unlike the visual projects, it runs in CI, since it compares behaviour rather than pixels.

### CI Playwright container version

The `integration` and `e2e-supabase` jobs run inside the
`mcr.microsoft.com/playwright` Docker image, which bundles a specific browser
build. That build must match the `@playwright/test` version installed from
`package.json`, or tests fail with `browserType.launch: Executable doesn't
exist`. Rather than hardcoding the image tag in both jobs (and re-breaking it
on every Dependabot Playwright bump), a `playwright-version` job reads
`@playwright/test` from `package.json` and both jobs consume its output as
`needs.playwright-version.outputs.image` — the container tag always tracks
whatever version is actually installed.

### CI secrets on Dependabot PRs

Workflow runs triggered by `dependabot[bot]` only receive secrets from the
Dependabot secrets store — never repository Actions secrets or environment
secrets, even after an environment approval. So the three `E2E_SUPABASE_*`
API secrets used by `e2e-supabase` are mirrored into the Dependabot store, and
Dependabot PRs run the full E2E suite with no manual step. Rotating those keys
means updating both copies. `E2E_SUPABASE_DB_PASSWORD` is the exception (see
below): it's only in the Actions store.

`e2e-supabase` pushes the PR's pending migrations to the e2e project before it
runs the tests (`E2E_SUPABASE_DB_PASSWORD`; the project ref comes from the
subdomain of `E2E_SUPABASE_URL`), so the
tests always run against the schema the PR's code expects. Dependabot PRs skip
that step, and the preflight doesn't require the password for them: they only
bump dependencies, so they test against the schema maintainers' PRs have
already pushed, and the database password stays out of the Dependabot store. It connects the
same way `migrate-prod` does. If the e2e project is in a different region,
set the `E2E_SUPABASE_POOLER_HOST` repository variable. A migration from a PR
that's closed unmerged stays applied to the e2e project, which is acceptable
only because that project never holds real data.

Only the E2E project's secrets are mirrored. Prod secrets
(`SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`) are only needed by
`migrate-prod` on `main` and stay out of the Dependabot store. The trade-off
of no approval gate is that a compromised dependency could read the E2E
project's service-role key, so that project must never hold real data.

The `secret-preflight` job checks the `E2E_SUPABASE_*` secrets on every PR
(including the migration password) and posts a PR comment naming any that are
missing.

### Performance Instrumentation

The app includes lightweight client-side telemetry to help diagnose slow pages and route transitions:

- Web vitals tracked in the browser: `TTFB`, `FCP`, `LCP`, `CLS`, `INP`
- Route transition timing tracked in `app/root.tsx` using React Router navigation state
- Metrics are sent to `POST /perf` via `navigator.sendBeacon` with a `fetch(..., { keepalive: true })` fallback
- Server-side processing currently logs only slow metrics to reduce noise

Implementation files:

- Client metrics collection: `app/lib/performance.client.ts`
- Metric ingestion route: `app/routes/perf.ts`

### Deferred Sentry (client)

The client Sentry SDK (~80 KB gzipped with tracing + replay) is kept off the critical path. Nothing imports `@sentry/react-router` statically on the client:

- `app/lib/monitoring.client.ts` is the only entry point. `initMonitoring()` runs after `hydrateRoot` and dynamic-imports `app/lib/sentry.client.ts` once the browser is idle (`requestIdleCallback`, 3s timeout).
- Uncaught errors and unhandled rejections before then are queued by early `window` listeners, and `reportError()` (used by the root `ErrorBoundary`) queues too; the queue is flushed into Sentry once it initialises.
- `sentry.client.ts` uses named imports so the dynamic chunk still tree-shakes. Don't `await import("@sentry/react-router")` directly — the namespace import pulls in every integration.
- There's deliberately no `manualChunks` rule for `@sentry/`: it dragged `react` into the Sentry chunk, which made the entry import it eagerly.
- The chunk is precached by the service worker like any other asset, so it works offline. Sentry's CDN `lazyLoadIntegration()` isn't used for that reason.

Trade-offs: the pageload trace starts late, and errors in the first second or so get no on-error replay (they're still captured). Server-side Sentry (`entry.server.tsx`, `instrument.server.mjs`) is unaffected.

### Page header

Each page under the app layout renders its own [`<PageHeader>`](app/components/page-header/page-header.tsx), passing its actions (Sign out and pending sign-ups on home; Style, Colours and Group by tag on a list). The layout used to render the breadcrumbs, with each page's actions placed separately in the same grid cell, so neither made room for the other and a long list name ran under the buttons.

- The breadcrumbs and actions share one flex row. The current page's title shrinks and truncates with an ellipsis. The actions take the rest of the row, but never less than their icon-only width.
- The actions are a size container. Below a threshold they show icons only, as square buttons. Each one wraps its text in `<ActionLabel>`, which is visually hidden then, so it stays the control's accessible name.
- The threshold is fixed per header (`compactBelow`) because a container query can't read its content's width. Each is set to what that header's labelled actions need in the widest app style (brutalist): 15rem for home's two, and 27rem for the list's Style, Colours and Group by tag.

### Notifications

Notifications open a panel in the page grid's `notifications` row, between the breadcrumbs and the content, rather than floating over the page. It shows the newest one with a count of the rest. Successes are confirmations, so they clear themselves after 5s, with a small clock showing the time left. The countdown starts when the panel first shows one, so a success queued behind a newer notification waits its turn rather than clearing unseen; once started it keeps going even if covered, so one already seen doesn't come back later. It pauses while the panel is hovered or focused: the store stops its timers and keeps their time left, and the clock's CSS animation pauses with them (it starts part way through for one that's come back to the front). Everything else, and anything with an action (e.g. "Reload"), stays until the user clears it ("Clear", or "Clear all" when there's more than one). Showing one that's already queued (same `id`, which defaults to its type and message) moves it to the front instead of stacking a copy.

- Call `toast.*` from `~/lib/toast` anywhere: loaders' flash messages (`remix-toast`, shown by the app and auth layouts), client actions and effects. It's a small external store, read by `<Notifications>` ([app/components/notifications](app/components/notifications)) with `useSyncExternalStore`.
- It replaced Sonner, which floated toasts over the page, had to be lazy-loaded to stay off the critical path, and dropped toasts emitted before its `<Toaster>` mounted. The store has nothing to load and holds notifications until the panel reads them.
- The panel animates `grid-template-rows` between `0fr` and `1fr` (skipped for reduced motion), and keeps the last notification on screen until the closing animation ends. Its `role="status"` region is always rendered, so screen readers announce new notifications.

## Deployment

Built as a Docker image (`Dockerfile`) and deployed via Coolify, which fronts
the container with a Traefik reverse proxy that terminates TLS and forwards
plain HTTP plus `X-Forwarded-Proto: https` / `X-Forwarded-Host`.

### Forwarded-proto / action origin validation

React Router 8.3.1 added an action-origin CSRF check: a POST to a UI route is
rejected (sanitised `400`) unless its `Origin` header matches the origin of
`request.url`. The server must therefore reconstruct `request.url` with the
_external_ scheme and host, not the proxy's internal `http://…`.

`react-router.config.ts` sets `allowedActionOrigins` to the public host(s) as a
safety net. The durable fix is a custom server that trusts the proxy headers so
`request.url` is correct for every host (including preview deployments) without
an allow-list entry — see the follow-up PR that replaces `react-router-serve`.
