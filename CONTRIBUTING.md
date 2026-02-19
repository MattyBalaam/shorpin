# Contributing

## TypeScript

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
