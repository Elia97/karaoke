import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as schema from '@workspace/db/schema'
import type { DbClient } from '@workspace/db/client'

export type AuthConfig = {
  db: DbClient
  googleClientId: string
  googleClientSecret: string
  baseUrl: string
  secret: string
}

export function createAuth(config: AuthConfig) {
  return betterAuth({
    database: drizzleAdapter(config.db, {
      provider: 'pg',
      schema: {
        user: schema.user,
        account: schema.account,
        session: schema.authSession,
        verification: schema.verification,
      },
    }),
    baseURL: config.baseUrl,
    secret: config.secret,
    socialProviders: {
      google: {
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
