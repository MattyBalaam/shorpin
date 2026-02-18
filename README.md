A todo style app running on Netlify built with React Router SSR Framework mode

- **Framework**: React Router v7 (SSR)
- **Language**: TypeScript
- **Styling**: Vanilla Extract CSS-in-JS
- **Build Tool**: Vite
- **Testing**: Playwright with accessibility testing
- **Package Manager**: pnpm

## Architecture

### Routing Structure

The app uses React Router 7's file-based routing with explicit route definitions in [app/routes.ts](app/routes.ts):

```
/ (home)                              → app/routes/home.tsx
/lists/:list                          → app/routes/list/list.tsx
/lists/:list/confirm-delete           → app/routes/delete.tsx
```

**TypeScript**

- Prefer using satisfies keyword over inline declarations
- Prefer leaning on TypeScript inference over defining types

**Route Hierarchy:**

- Root Layout: [app/root.tsx](app/root.tsx) - Provides main container (max-width: 60ch), toast notifications, and breadcrumbs
- Flat routing structure with one level of nesting for the delete confirmation modal
- Dynamic route parameter `:list` maps to list slugs in the database

**Data Loading:**

- Loaders fetch data server-side (Supabase queries)
- Real-time updates via Supabase broadcast channels
- Form actions handle mutations with optimistic UI updates via Conform

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

### Authentication (Supabase)

**Password Reset Setup:**

The password reset flow uses a two-step route pattern:

1. `/auth/confirm` — exchanges the OTP token from the email link and redirects to `/reset-password`
2. `/reset-password` — renders the new password form; action calls `supabase.auth.updateUser()`

**Required Supabase dashboard configuration:**

In **Authentication → Email Templates → Reset Password**, update the link href from the default `{{ .ConfirmationURL }}` to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a>
```

In **Authentication → URL Configuration**, add the following to **Redirect URLs**:

```
https://<your-domain>/auth/confirm
https://<your-domain>/reset-password
```

Set **Site URL** to your deployment URL (e.g. `https://shorpin.matthewbalaam.co.uk`). For local development, also add `http://localhost:5173` to Redirect URLs.

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
