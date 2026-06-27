import { describe, expect, it } from "vitest";
import { resolveEmailDelivery } from "./email-config";

describe("resolveEmailDelivery", () => {
  it("uses console delivery locally without Resend", () => {
    expect(resolveEmailDelivery({ nodeEnv: "development", hasApiKey: false }).mode).toBe("console");
  });

  it("replaces the example.com placeholder with Resend's testing sender", () => {
    expect(
      resolveEmailDelivery({
        nodeEnv: "development",
        hasApiKey: true,
        from: "Be Rich <auth@example.com>",
      }).from,
    ).toBe("Be Rich <onboarding@resend.dev>");
  });

  it("forbids console delivery in production", () => {
    expect(() =>
      resolveEmailDelivery({ mode: "console", nodeEnv: "production", hasApiKey: false }),
    ).toThrow(/forbidden in production/);
  });
});
