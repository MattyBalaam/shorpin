# Claude Code Guidelines

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

### Agent behaviour

- Add any existing architectural decisions and overall app structure to the README.md file.
- Commit changes after every instruction with brief commit notes consisting of brief overview and maximum of 8 bullet points
