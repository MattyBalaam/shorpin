# Contributing

## TypeScript

Apply the guidelines below with pragmatism. A one-off internal helper does not need the same rigour as a public component API. The goal is to catch real mistakes at compile time, not to over-engineer simple code.

- Prefer using `satisfies` keyword over inline type declarations
- Prefer leaning on TypeScript inference over defining types explicitly

### String unions over `string`

Prefer a string union over a bare `string` type when only a finite set of values is valid:

```ts
// Good
type Variant = "default" | "button";

// Avoid
type Variant = string;
```

For coupled props, use a discriminated union so invalid combinations are impossible at compile time:

```ts
// Good — type and autocomplete are enforced together
type AuthFieldProps = {
  label: string;
} & (
  | { type: "email"; autocomplete: "email" }
  | { type: "password"; autocomplete: "current-password" | "new-password" }
);
```

### Derive types from config objects

When a type would duplicate the keys of a constant object, derive it with `keyof typeof` so the object is the single source of truth:

```ts
// Good — type is derived, object is the source of truth
const routes = { home: "/", login: "/login" } as const;
type RouteName = keyof typeof routes; // "home" | "login"

// Avoid — type and object maintained separately
type RouteName = "home" | "login";
const routes: Record<RouteName, string> = { home: "/", login: "/login" };
```

### Advanced type patterns

Look for opportunities to use discriminated unions and generics where they genuinely reduce mistakes or remove duplication — but only when the added complexity pays for itself.

Good candidates:

- **Discriminated unions** — when two or more props are semantically coupled and certain combinations are invalid (e.g. `type`/`autoComplete`, `status`/`errorMessage`)
- **Generics** — when the same logic applies to multiple types and the type parameter carries meaningful information to the caller (e.g. a typed `fetchJson<T>` helper or a `report<Schema>` function)

Skip them when:

- The code is used in one place and the type is obvious from context
- The union would have only one member (just use a plain type)
- A generic parameter would be `any` or `unknown` in practice

### Return types

Omit explicit return types when TypeScript can trivially infer them. Only annotate return types when the inferred type would be complex, ambiguous, or wider than intended (e.g. unions, generics, overloads).

```ts
// Good — inference is obvious
export function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// Good — explicit type clarifies a complex return
export function parseResult(input: string): Result<User, ValidationError> {
  // ...
}
```

## TanStack Start Patterns

### Type-safe routing

Route paths are typed from the route tree ([src/routes.ts](src/routes.ts)). Pass the route's path pattern and its `params` rather than building a URL, so a renamed or restructured route fails to compile:

```tsx
import { Link, redirect } from "@tanstack/solid-router";

// Good
throw redirect({ to: "/login" });
<Link to="/lists/$list" params={{ list: slug }}>
  …
</Link>;

// Avoid
throw redirect({ href: "/login" });
<a href={`/lists/${slug}`}>…</a>;
```

### Server functions

A route's data and mutations live in a `*.functions.ts` module beside it, as `createServerFn` calls. Server-only helpers go in `*.server.ts`.

- Every server function that reads or writes a user's data uses `authMiddleware` ([supabase.middleware.ts](src/lib/supabase.middleware.ts)). A server function is its own endpoint, so it can't rely on the page that calls it being protected.
- Return expected failures as data (`{ ok: false, error }`) and let the page show the toast. Throw only for real errors, which reach the route's error boundary and Sentry.

### Browser-only code

Name a module that only works in the browser `*.browser.ts`, and wrap each export in `createClientOnlyFn` where it's defined. Keep its top level free of browser APIs, since it still runs on the server. A module that needs the browser at its top level stays `*.client.ts` and is imported lazily (see "Client-only modules" in [README.md](README.md#migration-to-tanstack-start--solid)).

## UI Patterns

### No disabled buttons

Don't disable buttons (`Button` doesn't accept `disabled`). A disabled button gives no reason why it doesn't work, can't be focused, and is easy to miss. Keep it enabled, guard the handler, and tell the user why the action can't happen yet:

```tsx
// Good
function recreate() {
  if (state !== "idle") {
    toast.info("Still saving - try again in a moment");
    return;
  }
  // ...
}

// Avoid
<button disabled={state !== "idle"} onClick={recreate}>
```

## Solid Patterns

See the Solid 2 gotchas in [README.md](README.md#migration-to-tanstack-start--solid) too.

### Props

Don't destructure props: a component runs once, and destructuring reads each prop at that moment, losing later updates. Read them as `props.value` where they're used.

Reading a JSX prop (`props.children`, or a prop that holds elements) builds its elements each time. Read it once with `children(() => props.children)`, or keep the prop as data and build the JSX in the template, or hydration won't match the server's HTML.

### onSettled

Use `onSettled` for setup that needs the browser (listeners, observers, service worker registration). It runs once the component is on screen, and only in the browser. Name the function to describe its intent, and return a cleanup function or nothing. It throws on any other return value, including a Promise:

```tsx
// Good
onSettled(function trackKeyboardViewport() {
  // ...
  return () => controller.abort();
});

// Avoid: anonymous, and returns the Promise from scrollIntoView
onSettled(() => element.scrollIntoView());
```

### createEffect

Effects take two functions: the first reads the reactive values (tracked), and the second acts on them (untracked). Keep side effects in the second, and return its cleanup from there:

```tsx
createEffect(
  () => data().listId,
  (listId) => {
    const unsubscribe = subscribe(listId);
    return unsubscribe;
  },
);
```

Don't use an effect to copy one signal into another. Derive it with a function or `createMemo`, or use a writable derived signal (`createSignal(() => source())`) when the page also writes to it (see the list page's items).

### Context

Provide a context by rendering it (`<OnlineContext value={isOnline}>`) and read it with `useContext`.

## Testing

### Selectors

Query elements in order of preference:

**1. `getByLabel` — for all form controls**

```ts
// Good
await page.getByLabel("Email").fill("user@example.com");
await page.getByLabel("Password").fill("secret");

// Avoid
await page.locator("input[type=email]").fill("user@example.com");
await page.locator("#password").fill("secret");
```

**2. `getByRole` with an accessible name — for everything else**

```ts
// Good
await page.getByRole("button", { name: "Sign in" }).click();
await page.getByRole("link", { name: "Shopping" }).click();
await expect(page.getByRole("link", { name: "Configure" })).toHaveCount(2);

// Avoid
await page.locator(".submit-button").click();
await page.locator("a[href='/lists/shopping']").click();
```

The `name` matches the element's accessible name — the visible text, `aria-label`, or text derived from `aria-labelledby`. It accepts a string (exact match) or a `RegExp` for partial matches.

**Fallback — attribute selectors**

Only use attribute selectors when the element has no accessible name and adding one would require changing production markup solely for test purposes (e.g. unlabelled list item inputs where the value itself is the only identifier):

```ts
// Acceptable — no label exists on list item inputs
await expect(page.locator('input[value="Milk"]')).toBeVisible();
```

Prefer improving accessibility in the component (adding a `<label>` or `aria-label`) over reaching for an attribute selector.

### Accessibility

#### Prefer screen reader-only text over `aria-label`

When an element has visible text and you need to augment it for screen readers, prefer a `VisuallyHidden` component over `aria-label` to keep the accessible text visible in the DOM:

```tsx
// Good — text remains in the DOM for accessibility tools
<span class={styles.unreadBadge}>
  {unreadCount()}
  <VisuallyHidden> unread</VisuallyHidden>
</span>

// Avoid — aria-label is harder to maintain and debug
<span class={styles.unreadBadge} aria-label={`${unreadCount()} unread`}>
  {unreadCount()}
</span>
```

Use `aria-label` only when there's no visible text to augment (e.g., icon-only buttons).

### Event Listeners

Use `AbortController` for event listener cleanup instead of manual `removeEventListener`:

```tsx
onSettled(function trackOnlineStatus() {
  const controller = new AbortController();
  const { signal } = controller;

  window.addEventListener("online", () => setIsOnline(true), { signal });
  window.addEventListener("offline", () => setIsOnline(false), { signal });

  return () => controller.abort();
});
```
