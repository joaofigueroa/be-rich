export type EmailDeliveryMode = "console" | "resend";

const RESEND_TEST_FROM = "Be Rich <onboarding@resend.dev>";

const UNVERIFIABLE_SENDER_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "icloud.com",
  "outlook.com",
  "yahoo.com",
]);

function senderDomain(from: string) {
  return from.match(/@([^>\s]+)>?$/)?.[1]?.toLowerCase();
}

export function resolveEmailDelivery(input: { mode?: string; from?: string; nodeEnv?: string }) {
  const requestedMode = input.mode?.trim().toLowerCase();
  const mode: EmailDeliveryMode =
    requestedMode === "console" || requestedMode === "resend"
      ? requestedMode
      : input.nodeEnv === "production"
        ? "resend"
        : "console";

  if (mode === "console" && input.nodeEnv === "production") {
    throw new Error("EMAIL_DELIVERY_MODE=console is forbidden in production");
  }

  const configuredFrom = input.from?.trim();
  const domain = configuredFrom ? senderDomain(configuredFrom) : undefined;
  const from =
    !configuredFrom ||
    /@example\.(com|org|net)>?$/i.test(configuredFrom) ||
    (domain ? UNVERIFIABLE_SENDER_DOMAINS.has(domain) : false)
      ? RESEND_TEST_FROM
      : configuredFrom;

  return { mode, from };
}
