import { and, eq, sql } from "drizzle-orm"
import type { DbClient } from "@workspace/db/client"
import * as schema from "@workspace/db/schema"
import type { CatalogTrackDto } from "@workspace/protocol/domain"
import { generateId } from "../utils/id"
import type { ParsedTrack } from "./parsers/types"

export type CatalogService = ReturnType<typeof createCatalogService>

export function createCatalogService(db: DbClient) {
  async function bulkInsertTracks(input: {
    ownerId: string
    tracks: ParsedTrack[]
  }): Promise<{ count: number }> {
    if (input.tracks.length === 0) return { count: 0 }
    const now = new Date()
    const rows = input.tracks.map((t) => ({
      id: generateId(),
      ownerId: input.ownerId,
      title: t.title,
      artist: t.artist,
      filename: t.filename,
      durationSeconds: t.durationSeconds,
      searchVector: sql<string>`setweight(to_tsvector('simple', ${t.title}), 'A') || setweight(to_tsvector('simple', ${t.artist}), 'B')`,
      createdAt: now,
      updatedAt: now,
    }))
    await db.insert(schema.catalogTrack).values(rows)
    return { count: rows.length }
  }

  async function clearByOwner(ownerId: string): Promise<void> {
    await db
      .delete(schema.catalogTrack)
      .where(eq(schema.catalogTrack.ownerId, ownerId))
  }

  async function countByOwner(ownerId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.catalogTrack)
      .where(eq(schema.catalogTrack.ownerId, ownerId))
    return row?.count ?? 0
  }

  async function searchTracks(input: {
    ownerId: string
    query: string
    limit: number
  }): Promise<CatalogTrackDto[]> {
    const normalized = input.query.trim()
    if (!normalized) return []
    const tsquery = sql`plainto_tsquery('simple', ${normalized})`
    const rows = await db
      .select()
      .from(schema.catalogTrack)
      .where(
        and(
          eq(schema.catalogTrack.ownerId, input.ownerId),
          sql`${schema.catalogTrack.searchVector} @@ ${tsquery}`
        )
      )
      .orderBy(
        sql`ts_rank_cd(${schema.catalogTrack.searchVector}, ${tsquery}) DESC`
      )
      .limit(input.limit)
    return rows.map(rowToCatalogTrackDto)
  }

  return { bulkInsertTracks, clearByOwner, countByOwner, searchTracks }
}

export function rowToCatalogTrackDto(
  row: typeof schema.catalogTrack.$inferSelect
): CatalogTrackDto {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    artist: row.artist,
    filename: row.filename,
    durationSeconds: row.durationSeconds,
  }
}
