import { getDb, schema } from "@be-rich/database"
import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { resolveAuthSecret } from "@/lib/auth-secret"
import { loadRuntimeEnv } from "@/lib/runtime-env"
import { ensurePersonalWorkspace } from "@/server/services/workspaces/workspace-service"

loadRuntimeEnv()

function createAuth() {
  const secret = resolveAuthSecret({
    secret: process.env.BETTER_AUTH_SECRET,
    nodeEnv: process.env.NODE_ENV,
  })

  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3001"

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
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    databaseHooks: {
      user: {
        create: {
          after: async user => {
            await ensurePersonalWorkspace({ userId: user.id, userName: user.name })
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
        "/sign-in/email": { window: 900, max: 10 },
        "/sign-up/email": { window: 900, max: 5 },
      },
    },
    verification: {
      storeIdentifier: "hashed",
    },
    plugins: [nextCookies()],
    trustedOrigins: [
      baseURL,
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      "https://be-rich-6qpivzr0i-joao-figueroas-projects.vercel.app",
    ],
  })
}

let authInstance: ReturnType<typeof createAuth> | null = null

export function getAuth() {
  authInstance ??= createAuth()
  return authInstance
}
