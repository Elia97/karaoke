import { eq } from "drizzle-orm"
import type { DbClient } from "@workspace/db/client"
import * as schema from "@workspace/db/schema"
import { fetchLrclibLyrics } from "./lrclib.client"

export type LyricsResult = {
  syncedLyrics: string | null
  plainLyrics: string | null
  source: "lrclib" | "manual" | "cache" | "miss"
}

export type LyricsService = ReturnType<typeof createLyricsService>

export function createLyricsService(db: DbClient) {
  async function getLyricsForTrack(
    trackId: string
  ): Promise<LyricsResult | null> {
    const [track] = await db
      .select()
      .from(schema.catalogTrack)
      .where(eq(schema.catalogTrack.id, trackId))
      .limit(1)
    if (!track) return null

    if (track.lyricsLrc || track.lyricsPlain) {
      return {
        syncedLyrics: track.lyricsLrc,
        plainLyrics: track.lyricsPlain,
        source: "cache",
      }
    }

    const lrclibResult = await fetchLrclibLyrics({
      artist: track.artist,
      title: track.title,
      durationSeconds: track.durationSeconds,
    })

    if (!lrclibResult) {
      return { syncedLyrics: null, plainLyrics: null, source: "miss" }
    }

    const now = new Date()
    await db
      .update(schema.catalogTrack)
      .set({
        lyricsLrc: lrclibResult.syncedLyrics,
        lyricsPlain: lrclibResult.plainLyrics,
        lyricsSource: "lrclib",
        lyricsFetchedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.catalogTrack.id, trackId))

    return {
      syncedLyrics: lrclibResult.syncedLyrics,
      plainLyrics: lrclibResult.plainLyrics,
      source: "lrclib",
    }
  }

  return { getLyricsForTrack }
}
