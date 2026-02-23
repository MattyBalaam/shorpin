# Contributing

## TypeScript

Apply the guidelines below with pragmatism. A one-off internal helper does not need the same rigour as a public component API. The goal is to catch real mistakes at compile time, not to over-engineer simple code.

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
// Good — type and autoComplete are enforced together
type AuthFieldProps = {
  meta: FieldMetadata<string>;
  label: string;
} & (
  | { type: "email"; autoComplete: "email" }
  | { type: "password"; autoComplete: "current-password" | "new-password" }
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

## React Router Patterns

### Type-safe routing

Always use React Router's `href()` function for route paths instead of string literals. This provides compile-time safety when routes are renamed or restructured.

```ts
import { href, redirect } from "react-router";

// Good
throw redirect(href("/login"));
throw redirect(href("/lists/:list", { list: slug }));

// Avoid
throw redirect("/login");
throw redirect(`/lists/${slug}`);
```

## React Patterns

### useEffect

Always use named functions in useEffect callbacks to describe intent:

```tsx
// Good
useEffect(
  function subscribeToSSE() {
    // ...
  },
  [deps],
);

// Avoid
useEffect(() => {
  // ...
}, [deps]);
```

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
await expect(page.getByRole("link", { name: "admin" })).toHaveCount(2);

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

### Event Listeners

Use `AbortController` for event listener cleanup instead of manual `removeEventListener`:

```tsx
useEffect(function trackOnlineStatus() {
  const controller = new AbortController();
  const { signal } = controller;

  window.addEventListener("online", () => setIsOnline(true), { signal });
  window.addEventListener("offline", () => setIsOnline(false), { signal });

  return () => controller.abort();
}, []);
```
