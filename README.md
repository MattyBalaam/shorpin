A todo style app built with React Router SSR Framework mode. Oringally running on Netlify, but now using Coolify.

This is partly for me and my friends to use (product need), but also for me to grow my skills using Agentic AI to assist the build - for now mostly Claude Code.

- **Framework**: React Router v7 (SSR)
- **Language**: TypeScript
- **Styling**: Vanilla Extract CSS-in-JS
- **Build Tool**: Vite
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

## Architecture

### Routing Structure

The app uses React Router 7's file-based routing with explicit route definitions in [app/routes.ts](app/routes.ts):

```
/ (home)                              → app/routes/home.tsx
/lists/:list                          → app/routes/list/list.tsx
/lists/:list/confirm-delete           → app/routes/delete.tsx
```

**Route Hierarchy:**

- Root Layout: [app/root.tsx](app/root.tsx) - Provides main container (max-width: 60ch), toast notifications, and breadcrumbs
- Flat routing structure with one level of nesting for the delete confirmation modal
- Dynamic route parameter `:list` maps to list slugs in the database

**Data Loading:**

- Loaders fetch data server-side (Supabase queries)
- Real-time updates via Supabase broadcast channels
- Form actions handle mutations with optimistic UI updates via Conform
- List item mutations are consolidated into a single Supabase RPC (`public.mutate_list`) to keep add/edit/reorder/delete/undelete, deleted-item pruning, and list view timestamp writes transactional

### UI & Layout Patterns

**Root Layout** ([app/root.tsx](app/root.tsx)):

- Single `<main>` container with centered max-width (60ch)
- Breadcrumbs navigation component
- Sonner toast notifications
- Motion/React for stagger animations

**Component Structure:**

- Semantic HTML preferred (nav, ol, li elements)
- Form components using React Aria and Conform
- Reusable clickable elements with shared styles

### Styling Approach

**Vanilla Extract** (`@vanilla-extract/css`):

- All styles in `.css.ts` files (zero-runtime CSS-in-JS)
- Theme system with CSS variables via [app/theme.css.ts](app/theme.css.ts)
- CSS Layers for cascade control (reset, framework, app)

**Design Patterns:**

- CSS Grid with named grid lines for complex layouts
- Subgrid for nested alignment
- Flexbox for simpler layouts
- Logical properties (paddingInline, insetInline) for internationalization
- Shared `clickable` class for interactive elements

**Theme Variables:**

```typescript
vars.spacing.appMargin; // Consistent horizontal padding
vars.palette.primary; // Primary color
vars.palette.secondary; // Secondary color
```

### Component Architecture

**Key Components:**

- [Link](app/components/link/link.tsx) - Wrapper around React Router Link with variant support
- [Button](app/components/button/button.tsx) - Styled button using clickable styles
- [Items](app/components/items.tsx) - Drag-to-reorder list with Motion/React
- [Item](app/components/item.tsx) - Individual list item with swipe-to-delete
- [Breadcrumbs](app/components/breadcrumbs/breadcrumbs.tsx) - Navigation breadcrumbs using route handles

**Patterns to Follow:**

- Named functions in useEffect callbacks (see [CONTRIBUTING.md](CONTRIBUTING.md))
- Grid layouts with template areas and named grid lines
- Co-located styles using Vanilla Extract
- Conform for form validation and state management

### List Mutations (Add/Delete)

The list route (`app/routes/list/list.tsx`) does **not** use Conform's `__INTENT__`/`intents:` custom-intent system for add-item or delete-item. Conform's formal intent handlers always call `preventDefault()` for any named intent — only a bare `type: 'submit'` submission ever reaches the network — so anything routed through `__INTENT__` for a server mutation silently never fires (see PR #64 for the full investigation).

Instead:

- **Add** is signalled purely by a non-empty `new` field on an ordinary submit. The server (`mutate_list` RPC, and its mock in `mocks/api/rest/v1/list_items.ts`) inserts whenever that field is present — no intent needed.
- **Delete** is inferred server-side by diffing the submitted `items[]` array against the DB: any row that's currently active but missing from the array gets marked deleted. The client already submits the full items array on every request (edits/reorders rely on this too), so this needed no new payload shape.
- Conform itself is still used for schema validation and its **built-in** array intents (`intent.update`/`intent.remove`, used by `reorderViaConform`/`removeViaConform` in [reorder-strategies.ts](app/components/reorderable/reorder-strategies.ts)) — only the custom named-intent layer was removed.

**Delete sequencing matters:** shrinking Conform's tracked items array renumbers every later item's field name (e.g. `items[2]` becomes `items[1]`). If that happens while the outgoing row's `<input>`s are still mid-exit-animation, two inputs can briefly share one name and corrupt the submission — which the diff-based delete would read as "delete everything missing," not just a cosmetic glitch. `items.tsx`'s `ReorderableItem` closes this two ways:

- It never calls `intent.remove()` until the row's own exit fade has actually finished (`handleDeleteClick`/`handleDragEnd`'s fling both animate first, then commit in the animation's completion callback) — the array only shrinks once the node is already faded out.
- `Reorder.Item`'s `exit` transition is set to `duration: 0`. Without that, `AnimatePresence` plays a _second_, independent exit animation once the item is removed from the array — keeping the same stale, soon-to-be-renumbered node mounted for another full animation cycle and reopening the exact race the first fix was meant to close. There's nothing left to animate at that point (the manual fade already handled the visible part), so this exit is instant.

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

### Performance Instrumentation

The app includes lightweight client-side telemetry to help diagnose slow pages and route transitions:

- Web vitals tracked in the browser: `TTFB`, `FCP`, `LCP`, `CLS`, `INP`
- Route transition timing tracked in `app/root.tsx` using React Router navigation state
- Metrics are sent to `POST /perf` via `navigator.sendBeacon` with a `fetch(..., { keepalive: true })` fallback
- Server-side processing currently logs only slow metrics to reduce noise

Implementation files:

- Client metrics collection: `app/lib/performance.client.ts`
- Metric ingestion route: `app/routes/perf.ts`
