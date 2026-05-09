import { z } from "zod"
import type { CatalogParseResult, ParsedTrack } from "./types"

const RawJsonTrack = z.object({
  title: z.string().min(1).max(500),
  artist: z.string().min(1).max(500),
  filename: z.string().min(1).max(1000),
  duration: z.number().int().positive().nullable().optional(),
  durationSeconds: z.number().int().positive().nullable().optional(),
})

const RawJsonPayload = z.array(RawJsonTrack)

export function parseJsonCatalog(content: string): CatalogParseResult {
  const data: unknown = JSON.parse(content)
  const parsed = RawJsonPayload.safeParse(data)
  if (!parsed.success) {
    throw new Error(
      `Invalid JSON catalog payload: ${parsed.error.issues
        .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
        .join("; ")}`
    )
  }

  const tracks: ParsedTrack[] = parsed.data.map((t) => ({
    title: t.title.trim(),
    artist: t.artist.trim(),
    filename: t.filename.trim(),
    durationSeconds: t.durationSeconds ?? t.duration ?? null,
  }))
  return { tracks, skipped: 0 }
}
