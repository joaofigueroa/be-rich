const DEVELOPMENT_SECRET = "be-rich-local-development-only-secret-v1";

export function resolveAuthSecret(input: { secret?: string; nodeEnv?: string }) {
  const secret = input.secret?.trim();
  if (secret) return secret;
  if (input.nodeEnv !== "production") return DEVELOPMENT_SECRET;
  throw new Error(
    "BETTER_AUTH_SECRET is required in production. Configure it in the monorepo .env.local or deployment environment.",
  );
}
