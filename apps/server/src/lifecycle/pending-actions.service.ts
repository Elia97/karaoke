import { and, eq, inArray, lte } from "drizzle-orm"
import type { DbClient } from "@workspace/db/client"
import * as schema from "@workspace/db/schema"
import { generateId } from "../utils/id"

export type PendingActionType = "END_SESSION_ON_HOST_TIMEOUT"

export type PendingActionDto = {
  id: string
  type: PendingActionType
  sessionId: string
  executeAt: Date
  payload: Record<string, unknown>
}

export type PendingActionsService = ReturnType<
  typeof createPendingActionsService
>

export function createPendingActionsService(db: DbClient) {
  async function schedule(input: {
    type: PendingActionType
    sessionId: string
    executeAt: Date
    payload?: Record<string, unknown>
  }): Promise<PendingActionDto> {
    const id = generateId()
    const [row] = await db
      .insert(schema.pendingAction)
      .values({
        id,
        type: input.type,
        sessionId: input.sessionId,
        executeAt: input.executeAt,
        payload: input.payload ?? {},
      })
      .returning()
    if (!row) throw new Error("Failed to schedule pending action")
    return rowToDto(row)
  }

  async function cancelBySession(input: {
    sessionId: string
    type: PendingActionType
  }): Promise<number> {
    const deleted = await db
      .delete(schema.pendingAction)
      .where(
        and(
          eq(schema.pendingAction.sessionId, input.sessionId),
          eq(schema.pendingAction.type, input.type)
        )
      )
      .returning({ id: schema.pendingAction.id })
    return deleted.length
  }

  async function claimDue(now: Date, limit = 50): Promise<PendingActionDto[]> {
    const rows = await db
      .select()
      .from(schema.pendingAction)
      .where(lte(schema.pendingAction.executeAt, now))
      .limit(limit)
    if (rows.length === 0) return []
    await db.delete(schema.pendingAction).where(
      inArray(
        schema.pendingAction.id,
        rows.map((r) => r.id)
      )
    )
    return rows.map(rowToDto)
  }

  return { schedule, cancelBySession, claimDue }
}

function rowToDto(
  row: typeof schema.pendingAction.$inferSelect
): PendingActionDto {
  return {
    id: row.id,
    type: row.type,
    sessionId: row.sessionId,
    executeAt: row.executeAt,
    payload: row.payload,
  }
}
