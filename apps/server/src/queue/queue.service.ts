import { and, asc, eq, sql } from "drizzle-orm"
import type { DbClient } from "@workspace/db/client"
import * as schema from "@workspace/db/schema"
import type { QueueItemDto, QueueItemSource } from "@workspace/protocol/domain"
import { generateId } from "../utils/id"

export type QueueService = ReturnType<typeof createQueueService>

export type RequestSongInput = {
  sessionId: string
  singerId: string
  singerNickname: string
  title: string
  artist?: string | null
  trackId?: string | null
  filename?: string | null
  source: QueueItemSource
}

export class ActiveSongError extends Error {
  constructor(message = "Singer already has an active song") {
    super(message)
    this.name = "ActiveSongError"
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message)
    this.name = "ForbiddenError"
  }
}

export type AdvanceQueueResult = {
  completed: QueueItemDto | null
  nowPlaying: QueueItemDto | null
  prepare: QueueItemDto | null
}

export function createQueueService(db: DbClient) {
  async function requestSong(
    input: RequestSongInput,
    options: { allowMultipleSongsPerUser: boolean }
  ): Promise<QueueItemDto> {
    if (!options.allowMultipleSongsPerUser) {
      const existing = await db
        .select({ id: schema.queueItem.id })
        .from(schema.queueItem)
        .where(
          and(
            eq(schema.queueItem.sessionId, input.sessionId),
            eq(schema.queueItem.singerId, input.singerId),
            sql`${schema.queueItem.status} IN ('QUEUED', 'PREPARING')`
          )
        )
        .limit(1)
      if (existing.length > 0) {
        throw new ActiveSongError()
      }
    }
    const nextPosition = await getNextPosition(input.sessionId)
    const id = generateId()
    const now = new Date()
    const [row] = await db
      .insert(schema.queueItem)
      .values({
        id,
        sessionId: input.sessionId,
        singerId: input.singerId,
        singerNickname: input.singerNickname,
        title: input.title,
        artist: input.artist ?? null,
        trackId: input.trackId ?? null,
        filename: input.filename ?? null,
        source: input.source,
        status: "QUEUED",
        position: nextPosition,
        queuedAt: now,
      })
      .returning()
    if (!row) throw new Error("Failed to insert queue item")
    return rowToQueueItemDto(row)
  }

  async function removeSong(input: {
    sessionId: string
    queueItemId: string
    requesterParticipantId: string
    requesterRole: "HOST" | "PARTICIPANT"
  }): Promise<QueueItemDto | null> {
    const [item] = await db
      .select()
      .from(schema.queueItem)
      .where(
        and(
          eq(schema.queueItem.id, input.queueItemId),
          eq(schema.queueItem.sessionId, input.sessionId)
        )
      )
      .limit(1)
    if (!item) return null
    if (
      input.requesterRole !== "HOST" &&
      item.singerId !== input.requesterParticipantId
    ) {
      throw new ForbiddenError("Cannot remove another singer song")
    }
    if (item.status === "COMPLETED" || item.status === "SKIPPED") return null
    if (item.status === "PERFORMING") {
      const now = new Date()
      const [updated] = await db
        .update(schema.queueItem)
        .set({ status: "SKIPPED", completedAt: now, position: null })
        .where(eq(schema.queueItem.id, input.queueItemId))
        .returning()
      return updated ? rowToQueueItemDto(updated) : null
    }
    const [deleted] = await db
      .delete(schema.queueItem)
      .where(eq(schema.queueItem.id, input.queueItemId))
      .returning()
    return deleted ? rowToQueueItemDto(deleted) : null
  }

  async function advanceQueue(sessionId: string): Promise<AdvanceQueueResult> {
    const now = new Date()
    const [currentPerforming] = await db
      .select()
      .from(schema.queueItem)
      .where(
        and(
          eq(schema.queueItem.sessionId, sessionId),
          eq(schema.queueItem.status, "PERFORMING")
        )
      )
      .limit(1)
    let completed: QueueItemDto | null = null
    if (currentPerforming) {
      const [updated] = await db
        .update(schema.queueItem)
        .set({ status: "COMPLETED", completedAt: now, position: null })
        .where(eq(schema.queueItem.id, currentPerforming.id))
        .returning()
      if (updated) completed = rowToQueueItemDto(updated)
    }

    const [nextItem] = await db
      .select()
      .from(schema.queueItem)
      .where(
        and(
          eq(schema.queueItem.sessionId, sessionId),
          sql`${schema.queueItem.status} IN ('PREPARING', 'QUEUED')`
        )
      )
      .orderBy(
        sql`CASE ${schema.queueItem.status} WHEN 'PREPARING' THEN 0 ELSE 1 END`,
        asc(schema.queueItem.position)
      )
      .limit(1)
    let nowPlaying: QueueItemDto | null = null
    if (nextItem) {
      const [updated] = await db
        .update(schema.queueItem)
        .set({ status: "PERFORMING", startedAt: now })
        .where(eq(schema.queueItem.id, nextItem.id))
        .returning()
      if (updated) nowPlaying = rowToQueueItemDto(updated)
    }

    const [upcoming] = await db
      .select()
      .from(schema.queueItem)
      .where(
        and(
          eq(schema.queueItem.sessionId, sessionId),
          eq(schema.queueItem.status, "QUEUED")
        )
      )
      .orderBy(asc(schema.queueItem.position))
      .limit(1)
    let prepare: QueueItemDto | null = null
    if (upcoming) {
      const [updated] = await db
        .update(schema.queueItem)
        .set({ status: "PREPARING" })
        .where(eq(schema.queueItem.id, upcoming.id))
        .returning()
      if (updated) prepare = rowToQueueItemDto(updated)
    }

    return { completed, nowPlaying, prepare }
  }

  async function startPlayback(input: {
    sessionId: string
    queueItemId: string
  }): Promise<QueueItemDto | null> {
    const now = new Date()
    const [updated] = await db
      .update(schema.queueItem)
      .set({ actualStartedAt: now })
      .where(
        and(
          eq(schema.queueItem.id, input.queueItemId),
          eq(schema.queueItem.sessionId, input.sessionId),
          eq(schema.queueItem.status, "PERFORMING")
        )
      )
      .returning()
    return updated ? rowToQueueItemDto(updated) : null
  }

  async function listBySession(sessionId: string): Promise<QueueItemDto[]> {
    const rows = await db
      .select()
      .from(schema.queueItem)
      .where(eq(schema.queueItem.sessionId, sessionId))
      .orderBy(
        sql`CASE ${schema.queueItem.status}
              WHEN 'PERFORMING' THEN 0
              WHEN 'PREPARING' THEN 1
              WHEN 'QUEUED' THEN 2
              WHEN 'COMPLETED' THEN 3
              WHEN 'SKIPPED' THEN 4
            END`,
        asc(schema.queueItem.position),
        asc(schema.queueItem.queuedAt)
      )
    return rows.map(rowToQueueItemDto)
  }

  async function getNextPosition(sessionId: string): Promise<number> {
    const [row] = await db
      .select({
        max: sql<number | null>`MAX(${schema.queueItem.position})`,
      })
      .from(schema.queueItem)
      .where(
        and(
          eq(schema.queueItem.sessionId, sessionId),
          sql`${schema.queueItem.status} IN ('QUEUED', 'PREPARING')`
        )
      )
    return (row?.max ?? 0) + 1
  }

  return {
    requestSong,
    removeSong,
    advanceQueue,
    startPlayback,
    listBySession,
  }
}

export function rowToQueueItemDto(
  row: typeof schema.queueItem.$inferSelect
): QueueItemDto {
  return {
    id: row.id,
    sessionId: row.sessionId,
    singerId: row.singerId,
    singerNickname: row.singerNickname,
    title: row.title,
    artist: row.artist,
    trackId: row.trackId,
    filename: row.filename,
    source: row.source,
    status: row.status,
    position: row.position,
    queuedAt: row.queuedAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    actualStartedAt: row.actualStartedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  }
}
