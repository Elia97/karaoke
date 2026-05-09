import { Hono } from "hono"
import { z } from "zod"
import type { Auth } from "@workspace/auth/server"
import type { SessionService } from "../karaoke/session.service"

const CreateSessionBody = z.object({
  name: z.string().min(1).max(100),
  config: z
    .object({
      maxParticipants: z.number().int().min(0).default(0),
      prepareTimeSeconds: z.number().int().min(0).default(30),
      allowMultipleSongsPerUser: z.boolean().default(false),
    })
    .default({
      maxParticipants: 0,
      prepareTimeSeconds: 30,
      allowMultipleSongsPerUser: false,
    }),
})

export function createSessionsController(deps: {
  auth: Auth
  sessions: SessionService
}): Hono {
  const app = new Hono()

  app.post("/", async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session?.user) {
      return c.json({ error: "UNAUTHENTICATED" }, 401)
    }
    const parsed = CreateSessionBody.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json(
        { error: "INVALID_INPUT", issues: parsed.error.issues },
        400
      )
    }
    const created = await deps.sessions.createSession({
      hostId: session.user.id,
      name: parsed.data.name,
      config: parsed.data.config,
    })
    return c.json(created, 201)
  })

  return app
}
