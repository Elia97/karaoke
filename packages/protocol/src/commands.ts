import { z } from "zod"
import { CatalogTrackDto } from "./domain"
import { ErrorCode } from "./errors"

export const SearchTracksCommand = z.object({
  type: z.literal("searchTracks"),
  query: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(50).default(20),
})
export type SearchTracksCommand = z.infer<typeof SearchTracksCommand>

export const ClientCommand = z.discriminatedUnion("type", [SearchTracksCommand])
export type ClientCommand = z.infer<typeof ClientCommand>

export const SearchTracksAck = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), tracks: z.array(CatalogTrackDto) }),
  z.object({ ok: z.literal(false), error: ErrorCode }),
])
export type SearchTracksAck = z.infer<typeof SearchTracksAck>
