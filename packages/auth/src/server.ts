import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import * as schema from "@workspace/db/schema"
import type { DbClient } from "@workspace/db/client"

export type AuthConfig = {
  db: DbClient
  googleClientId: string
  googleClientSecret: string
  baseUrl: string
  secret: string
  trustedOrigins?: string[]
}

export function createAuth(config: AuthConfig) {
  const isHttps = config.baseUrl.startsWith("https://")
  return betterAuth({
    database: drizzleAdapter(config.db, {
      provider: "pg",
      schema: {
        user: schema.user,
        account: schema.account,
        session: schema.authSession,
        verification: schema.verification,
      },
    }),
    baseURL: config.baseUrl,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins ?? [],
    advanced: isHttps
      ? {
          defaultCookieAttributes: {
            sameSite: "none",
            secure: true,
            partitioned: true,
          },
        }
      : undefined,
    socialProviders: {
      google: {
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
