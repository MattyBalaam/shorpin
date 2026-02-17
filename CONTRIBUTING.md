# Contributing

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
