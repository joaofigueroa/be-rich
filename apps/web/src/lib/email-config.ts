export type EmailDeliveryMode = "console" | "resend";

const RESEND_TEST_FROM = "Be Rich <onboarding@resend.dev>";

export function resolveEmailDelivery(input: {
  mode?: string;
  from?: string;
  nodeEnv?: string;
  hasApiKey: boolean;
}) {
  const requestedMode = input.mode?.trim().toLowerCase();
  const mode: EmailDeliveryMode =
    requestedMode === "console" || requestedMode === "resend"
      ? requestedMode
      : input.nodeEnv === "production" || input.hasApiKey
        ? "resend"
        : "console";

  if (mode === "console" && input.nodeEnv === "production") {
    throw new Error("EMAIL_DELIVERY_MODE=console is forbidden in production");
  }

  const configuredFrom = input.from?.trim();
  const from =
    !configuredFrom || /@example\.(com|org|net)>?$/i.test(configuredFrom)
      ? RESEND_TEST_FROM
      : configuredFrom;

  return { mode, from };
}
