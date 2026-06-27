import { describe, expect, it } from "vitest";
import { resolveAuthSecret } from "./auth-secret";

describe("resolveAuthSecret", () => {
  it("uses the configured secret", () => {
    expect(resolveAuthSecret({ secret: "configured-secret", nodeEnv: "production" })).toBe(
      "configured-secret",
    );
  });

  it("provides a stable development-only fallback", () => {
    expect(resolveAuthSecret({ nodeEnv: "development" })).toBe(
      resolveAuthSecret({ nodeEnv: "development" }),
    );
  });

  it("fails closed in production", () => {
    expect(() => resolveAuthSecret({ nodeEnv: "production" })).toThrow(
      /BETTER_AUTH_SECRET is required in production/,
    );
  });
});
