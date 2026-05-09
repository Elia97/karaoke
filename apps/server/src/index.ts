import { Hono } from 'hono'
import { createDbClient } from '@workspace/db/client'
import { createAuth } from '@workspace/auth/server'

const databaseUrl = requireEnv('DATABASE_URL')
const googleClientId = requireEnv('GOOGLE_CLIENT_ID')
const googleClientSecret = requireEnv('GOOGLE_CLIENT_SECRET')
const authSecret = requireEnv('BETTER_AUTH_SECRET')
const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
const port = Number(process.env.PORT) || 3000

const db = createDbClient(databaseUrl)
const auth = createAuth({
  db,
  googleClientId,
  googleClientSecret,
  baseUrl,
  secret: authSecret,
})

const app = new Hono()

app.get('/', (c) => c.text('Karaoke server'))
app.get('/health', (c) =>
  c.json({ status: 'ok', uptime: process.uptime() }),
)

app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

console.log(`🎤 Karaoke server listening on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}
