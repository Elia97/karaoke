import { eq } from "drizzle-orm"
import type { DbClient } from "@workspace/db/client"
import * as schema from "@workspace/db/schema"
import type {
  KaraokeSessionConfig,
  KaraokeSessionDto,
  ParticipantDto,
  UserRole,
} from "@workspace/protocol/domain"
import { generateSessionCode } from "../utils/code"
import { generateId } from "../utils/id"

export type SessionService = ReturnType<typeof createSessionService>

export function createSessionService(db: DbClient) {
  async function createSession(input: {
    hostId: string
    name: string
    config: KaraokeSessionConfig
  }): Promise<KaraokeSessionDto> {
    const id = generateId()
    const code = await generateUniqueSessionCode()
    const now = new Date()
    const [row] = await db
      .insert(schema.karaokeSession)
      .values({
        id,
        hostId: input.hostId,
        name: input.name,
        code,
        status: "WAITING",
        config: input.config,
        createdAt: now,
        lastActivityAt: now,
      })
      .returning()
    if (!row) throw new Error("Failed to create session")
    return rowToSessionDto(row)
  }

  async function findByCode(code: string): Promise<KaraokeSessionDto | null> {
    const [row] = await db
      .select()
      .from(schema.karaokeSession)
      .where(eq(schema.karaokeSession.code, code.toUpperCase()))
      .limit(1)
    return row ? rowToSessionDto(row) : null
  }

  async function findById(id: string): Promise<KaraokeSessionDto | null> {
    const [row] = await db
      .select()
      .from(schema.karaokeSession)
      .where(eq(schema.karaokeSession.id, id))
      .limit(1)
    return row ? rowToSessionDto(row) : null
  }

  async function listParticipants(
    sessionId: string
  ): Promise<ParticipantDto[]> {
    const rows = await db
      .select()
      .from(schema.participant)
      .where(eq(schema.participant.sessionId, sessionId))
    return rows.map(rowToParticipantDto)
  }

  async function upsertParticipant(input: {
    id?: string
    sessionId: string
    nickname: string
    role: UserRole
  }): Promise<ParticipantDto> {
    const id = input.id ?? generateId()
    const now = new Date()
    const [row] = await db
      .insert(schema.participant)
      .values({
        id,
        sessionId: input.sessionId,
        nickname: input.nickname,
        role: input.role,
        isConnected: true,
        connectedAt: now,
        lastActivityAt: now,
      })
      .onConflictDoUpdate({
        target: schema.participant.id,
        set: {
          nickname: input.nickname,
          isConnected: true,
          lastActivityAt: now,
        },
      })
      .returning()
    if (!row) throw new Error("Failed to upsert participant")
    return rowToParticipantDto(row)
  }

  async function markParticipantDisconnected(
    participantId: string
  ): Promise<void> {
    const now = new Date()
    await db
      .update(schema.participant)
      .set({ isConnected: false, lastActivityAt: now })
      .where(eq(schema.participant.id, participantId))
  }

  async function generateUniqueSessionCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateSessionCode()
      const exists = await db
        .select({ id: schema.karaokeSession.id })
        .from(schema.karaokeSession)
        .where(eq(schema.karaokeSession.code, code))
        .limit(1)
      if (exists.length === 0) return code
    }
    throw new Error("Could not generate unique session code")
  }

  return {
    createSession,
    findByCode,
    findById,
    listParticipants,
    upsertParticipant,
    markParticipantDisconnected,
  }
}

function rowToSessionDto(
  row: typeof schema.karaokeSession.$inferSelect
): KaraokeSessionDto {
  return {
    id: row.id,
    hostId: row.hostId,
    name: row.name,
    code: row.code,
    status: row.status,
    config: row.config,
    createdAt: row.createdAt.toISOString(),
    lastActivityAt: row.lastActivityAt.toISOString(),
  }
}

function rowToParticipantDto(
  row: typeof schema.participant.$inferSelect
): ParticipantDto {
  return {
    id: row.id,
    sessionId: row.sessionId,
    nickname: row.nickname,
    role: row.role,
    isConnected: row.isConnected,
    connectedAt: row.connectedAt.toISOString(),
    lastActivityAt: row.lastActivityAt.toISOString(),
  }
}
