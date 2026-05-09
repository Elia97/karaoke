import { Hono } from "hono"
import { z } from "zod"
import type { Auth } from "@workspace/auth/server"
import type { ScreenPairingService } from "../screen/screen-pairing.service"
import type { SessionService } from "../karaoke/session.service"

const PairBody = z.object({
  screenToken: z.string().min(16).max(200),
})

const ConfirmBody = z.object({
  pairingCode: z.string().length(6),
  sessionId: z.string(),
})

export function createScreensController(deps: {
  auth: Auth
  screenPairing: ScreenPairingService
  sessions: SessionService
}): Hono {
  const app = new Hono()

  app.post("/pair", async (c) => {
    const parsed = PairBody.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ error: "INVALID_INPUT" }, 400)
    }
    const pairing = await deps.screenPairing.createPairing({
      screenToken: parsed.data.screenToken,
    })
    return c.json(
      {
        pairingCode: pairing.pairingCode,
        expiresAt: pairing.expiresAt,
      },
      201
    )
  })

  app.get("/status", async (c) => {
    const screenToken = c.req.query("screenToken")
    if (!screenToken) return c.json({ error: "INVALID_INPUT" }, 400)
    const pairing = await deps.screenPairing.findByToken(screenToken)
    if (!pairing) return c.json({ paired: false }, 404)
    if (!pairing.pairedAt || !pairing.sessionId) {
      return c.json({ paired: false, expiresAt: pairing.expiresAt })
    }
    const session = await deps.sessions.findById(pairing.sessionId)
    return c.json({
      paired: true,
      sessionCode: session?.code ?? null,
      sessionId: pairing.sessionId,
    })
  })

  app.post("/confirm-pair", async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session?.user) return c.json({ error: "UNAUTHENTICATED" }, 401)

    const parsed = ConfirmBody.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json({ error: "INVALID_INPUT" }, 400)
    }
    const target = await deps.sessions.findById(parsed.data.sessionId)
    if (!target) return c.json({ error: "SESSION_NOT_FOUND" }, 404)
    if (target.hostId !== session.user.id) {
      return c.json({ error: "FORBIDDEN" }, 403)
    }
    const result = await deps.screenPairing.confirmPair({
      pairingCode: parsed.data.pairingCode.toUpperCase(),
      sessionId: target.id,
      hostId: session.user.id,
    })
    if (!result) return c.json({ error: "PAIRING_NOT_FOUND" }, 404)
    return c.json({ ok: true })
  })

  return app
}
