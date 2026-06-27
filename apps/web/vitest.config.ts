import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": new URL("./src/test/server-only.ts", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: { reporter: ["text", "json", "html"] },
  },
});
