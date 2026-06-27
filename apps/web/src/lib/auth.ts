import { getDb, schema } from "@be-rich/database";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { sendMagicLinkEmail } from "@/lib/email";
import { ensurePersonalWorkspace } from "@/server/services/workspaces/workspace-service";

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required");
  }

  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  return betterAuth({
    appName: "Be Rich",
    baseURL,
    secret,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        ...schema,
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        rateLimit: schema.rateLimits,
      },
    }),
    advanced: {
      database: { generateId: false },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await ensurePersonalWorkspace({ userId: user.id, userName: user.name });
          },
        },
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/magic-link": { window: 900, max: 5 },
      },
    },
    verification: {
      storeIdentifier: "hashed",
    },
    plugins: [
      magicLink({
        expiresIn: 900,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLinkEmail({ email, url });
        },
      }),
      nextCookies(),
    ],
    trustedOrigins: [baseURL, "http://localhost:3000", "http://127.0.0.1:3000"],
  });
}

let authInstance: ReturnType<typeof createAuth> | null = null;

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}
