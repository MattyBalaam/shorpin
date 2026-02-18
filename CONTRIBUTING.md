# Contributing

## TypeScript

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
