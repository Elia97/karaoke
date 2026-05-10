import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { Server as SocketIOServer } from "socket.io"
import { createDbClient } from "@workspace/db/client"
import { createAuth } from "@workspace/auth/server"
import { createSignedToken, type HostTokenPayload } from "./utils/token"
import { createSessionService } from "./karaoke/session.service"
import { setupGateway } from "./karaoke/gateway"
import { createSessionsController } from "./http/sessions.controller"
import { createCatalogService } from "./catalog/catalog.service"
import { createCatalogController } from "./http/catalog.controller"
import { createQueueService } from "./queue/queue.service"
import { createPendingActionsService } from "./lifecycle/pending-actions.service"
import { createScheduler } from "./lifecycle/scheduler"
import { createScreenPairingService } from "./screen/screen-pairing.service"
import { createScreensController } from "./http/screens.controller"
import { createLyricsService } from "./lyrics/lyrics.service"

const databaseUrl = requireEnv("DATABASE_URL")
const googleClientId = requireEnv("GOOGLE_CLIENT_ID")
const googleClientSecret = requireEnv("GOOGLE_CLIENT_SECRET")
const authSecret = requireEnv("BETTER_AUTH_SECRET")
const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
const port = Number(process.env.PORT) || 3000
const allowedOrigins = (process.env.CORS_ORIGIN ?? "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
const corsOrigin: string | string[] =
  allowedOrigins.length === 1 && allowedOrigins[0] === "*"
    ? "*"
    : allowedOrigins

const db = createDbClient(databaseUrl)
const auth = createAuth({
  db,
  googleClientId,
  googleClientSecret,
  baseUrl,
  secret: authSecret,
  trustedOrigins: Array.isArray(corsOrigin) ? corsOrigin : [],
})
const sessions = createSessionService(db)
const catalog = createCatalogService(db)
const queue = createQueueService(db)
const pendingActions = createPendingActionsService(db)
const screenPairing = createScreenPairingService(db)
const lyrics = createLyricsService(db)

const app = new Hono()
app.use(
  "/api/*",
  cors({
    origin: corsOrigin,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
)
app.get("/", (c) => c.text("Karaoke server"))
app.get("/health", (c) => c.json({ status: "ok", uptime: process.uptime() }))
app.get("/api/auth/socket-token", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401)
  const token = createSignedToken<HostTokenPayload>(
    { userId: session.user.id },
    authSecret
  )
  return c.json({ token })
})
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
app.route("/api/sessions", createSessionsController({ auth, sessions }))
app.route("/api/catalog", createCatalogController({ auth, catalog }))
app.route(
  "/api/screens",
  createScreensController({ auth, screenPairing, sessions })
)

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

const gateway = setupGateway({
  io,
  sessions,
  catalog,
  queue,
  pendingActions,
  screenPairing,
  lyrics,
  participantTokenSecret: authSecret,
})

const scheduler = createScheduler({
  pendingActions,
  onAction: gateway.executePendingAction,
})
scheduler.start()

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}
