import { describe, expect, it } from "vitest";
import { resolveEmailDelivery } from "./email-config";

describe("resolveEmailDelivery", () => {
  it("uses console delivery locally without Resend", () => {
    expect(resolveEmailDelivery({ nodeEnv: "development" }).mode).toBe("console");
  });

  it("uses Resend locally only when explicitly requested", () => {
    expect(resolveEmailDelivery({ mode: "resend", nodeEnv: "development" }).mode).toBe("resend");
  });

  it("replaces the example.com placeholder with Resend's testing sender", () => {
    expect(
      resolveEmailDelivery({
        nodeEnv: "development",
        from: "Be Rich <auth@example.com>",
      }).from,
    ).toBe("Be Rich <onboarding@resend.dev>");
  });

  it("replaces a Gmail sender that cannot be verified by Resend", () => {
    expect(
      resolveEmailDelivery({
        mode: "resend",
        nodeEnv: "development",
        from: "Be Rich <someone@gmail.com>",
      }).from,
    ).toBe("Be Rich <onboarding@resend.dev>");
  });

  it("forbids console delivery in production", () => {
    expect(() => resolveEmailDelivery({ mode: "console", nodeEnv: "production" })).toThrow(
      /forbidden in production/,
    );
  });
});
