import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { Server as SocketIOServer } from "socket.io"
import { createDbClient } from "@workspace/db/client"
import { createAuth } from "@workspace/auth/server"
import { createSessionService } from "./karaoke/session.service"
import { setupGateway } from "./karaoke/gateway"
import { createSessionsController } from "./http/sessions.controller"
import { createCatalogService } from "./catalog/catalog.service"
import { createCatalogController } from "./http/catalog.controller"

const databaseUrl = requireEnv("DATABASE_URL")
const googleClientId = requireEnv("GOOGLE_CLIENT_ID")
const googleClientSecret = requireEnv("GOOGLE_CLIENT_SECRET")
const authSecret = requireEnv("BETTER_AUTH_SECRET")
const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
const port = Number(process.env.PORT) || 3000
const corsOrigin = process.env.CORS_ORIGIN ?? "*"

const db = createDbClient(databaseUrl)
const auth = createAuth({
  db,
  googleClientId,
  googleClientSecret,
  baseUrl,
  secret: authSecret,
})
const sessions = createSessionService(db)
const catalog = createCatalogService(db)

const app = new Hono()
app.get("/", (c) => c.text("Karaoke server"))
app.get("/health", (c) => c.json({ status: "ok", uptime: process.uptime() }))
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
app.route("/api/sessions", createSessionsController({ auth, sessions }))
app.route("/api/catalog", createCatalogController({ auth, catalog }))

const httpServer = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`🎤 Karaoke server listening on http://localhost:${info.port}`)
  }
)

const io = new SocketIOServer(httpServer, {
  cors: { origin: corsOrigin, credentials: true },
})

setupGateway({
  io,
  auth,
  sessions,
  catalog,
  participantTokenSecret: authSecret,
})

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}
