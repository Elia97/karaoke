import { and, eq, gt } from "drizzle-orm"
import type { DbClient } from "@workspace/db/client"
import * as schema from "@workspace/db/schema"
import { generateId } from "../utils/id"
import { generateSessionCode } from "../utils/code"

const PAIRING_TTL_MS = 5 * 60 * 1000

export type ScreenPairingDto = {
  id: string
  screenToken: string
  pairingCode: string
  sessionId: string | null
  hostId: string | null
  createdAt: string
  expiresAt: string
  pairedAt: string | null
}

export type ScreenPairingService = ReturnType<typeof createScreenPairingService>

export function createScreenPairingService(db: DbClient) {
  async function createPairing(input: {
    screenToken: string
  }): Promise<ScreenPairingDto> {
    const id = generateId()
    const now = new Date()
    const pairingCode = generateSessionCode()
    const expiresAt = new Date(now.getTime() + PAIRING_TTL_MS)
    const [row] = await db
      .insert(schema.screenPairing)
      .values({
        id,
        screenToken: input.screenToken,
        pairingCode,
        createdAt: now,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: schema.screenPairing.screenToken,
        set: {
          pairingCode,
          createdAt: now,
          expiresAt,
          sessionId: null,
          hostId: null,
          pairedAt: null,
        },
      })
      .returning()
    if (!row) throw new Error("Failed to create screen pairing")
    return rowToDto(row)
  }

  async function findByToken(
    screenToken: string
  ): Promise<ScreenPairingDto | null> {
    const [row] = await db
      .select()
      .from(schema.screenPairing)
      .where(eq(schema.screenPairing.screenToken, screenToken))
      .limit(1)
    return row ? rowToDto(row) : null
  }

  async function findByCode(
    pairingCode: string
  ): Promise<ScreenPairingDto | null> {
    const now = new Date()
    const [row] = await db
      .select()
      .from(schema.screenPairing)
      .where(
        and(
          eq(schema.screenPairing.pairingCode, pairingCode.toUpperCase()),
          gt(schema.screenPairing.expiresAt, now)
        )
      )
      .limit(1)
    return row ? rowToDto(row) : null
  }

  async function confirmPair(input: {
    pairingCode: string
    sessionId: string
    hostId: string
  }): Promise<ScreenPairingDto | null> {
    const found = await findByCode(input.pairingCode)
    if (!found) return null
    if (found.pairedAt) return found
    const now = new Date()
    const [row] = await db
      .update(schema.screenPairing)
      .set({
        sessionId: input.sessionId,
        hostId: input.hostId,
        pairedAt: now,
      })
      .where(eq(schema.screenPairing.id, found.id))
      .returning()
    return row ? rowToDto(row) : null
  }

  return { createPairing, findByToken, findByCode, confirmPair }
}

function rowToDto(
  row: typeof schema.screenPairing.$inferSelect
): ScreenPairingDto {
  return {
    id: row.id,
    screenToken: row.screenToken,
    pairingCode: row.pairingCode,
    sessionId: row.sessionId,
    hostId: row.hostId,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    pairedAt: row.pairedAt?.toISOString() ?? null,
  }
}
