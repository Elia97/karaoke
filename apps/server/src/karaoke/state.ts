import type {
  KaraokeSessionDto,
  ParticipantDto,
  QueueItemDto,
} from "@workspace/protocol/domain"

export type SessionRoom = {
  session: KaraokeSessionDto
  participants: Map<string, ParticipantDto>
  queue: QueueItemDto[]
  currentSong: QueueItemDto | null
}

const rooms = new Map<string, SessionRoom>()

export function getRoom(sessionId: string): SessionRoom | undefined {
  return rooms.get(sessionId)
}

export function getOrCreateRoom(
  sessionId: string,
  factory: () => SessionRoom
): SessionRoom {
  const existing = rooms.get(sessionId)
  if (existing) return existing
  const created = factory()
  rooms.set(sessionId, created)
  return created
}

export function deleteRoom(sessionId: string): void {
  rooms.delete(sessionId)
}
