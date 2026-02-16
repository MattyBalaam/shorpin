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
- Commit changes to git after every instruction with brief commit notes consisting of brief overview title and maximum of 8 bullet points.

## Scripts

Use the project's pnpm scripts instead of direct commands:

- `pnpm typecheck` - Run TypeScript type checking (not `npx tsc`)

Always use `pnpx` instead of `npx` for running package binaries.
