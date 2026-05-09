import { Hono } from "hono"
import { z } from "zod"
import type { Auth } from "@workspace/auth/server"
import type { CatalogService } from "../catalog/catalog.service"
import { parseVirtualDjXml } from "../catalog/parsers/virtualdj-xml.parser"
import { parseJsonCatalog } from "../catalog/parsers/json.parser"

const ImportBody = z.object({
  source: z.enum(["json", "virtualdj-xml"]),
  content: z
    .string()
    .min(1)
    .max(20 * 1024 * 1024),
  replace: z.boolean().default(false),
})

export function createCatalogController(deps: {
  auth: Auth
  catalog: CatalogService
}): Hono {
  const app = new Hono()

  app.post("/import", async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session?.user) {
      return c.json({ error: "UNAUTHENTICATED" }, 401)
    }
    const parsed = ImportBody.safeParse(await c.req.json())
    if (!parsed.success) {
      return c.json(
        { error: "INVALID_INPUT", issues: parsed.error.issues },
        400
      )
    }
    const { source, content, replace } = parsed.data
    let result
    try {
      result =
        source === "virtualdj-xml"
          ? parseVirtualDjXml(content)
          : parseJsonCatalog(content)
    } catch (e) {
      return c.json(
        {
          error: "INVALID_CATALOG",
          message: e instanceof Error ? e.message : "Parse error",
        },
        400
      )
    }
    if (replace) {
      await deps.catalog.clearByOwner(session.user.id)
    }
    const { count } = await deps.catalog.bulkInsertTracks({
      ownerId: session.user.id,
      tracks: result.tracks,
    })
    const total = await deps.catalog.countByOwner(session.user.id)
    return c.json({ imported: count, skipped: result.skipped, total }, 201)
  })

  app.get("/", async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session?.user) {
      return c.json({ error: "UNAUTHENTICATED" }, 401)
    }
    const total = await deps.catalog.countByOwner(session.user.id)
    return c.json({ total })
  })

  return app
}
