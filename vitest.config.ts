import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.{ts,tsx}"],
    // Tests for code not yet ported (see legacy/README.md).
    exclude: [...configDefaults.exclude, "legacy/**"],
  },
});
