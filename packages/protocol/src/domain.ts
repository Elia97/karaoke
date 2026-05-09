import { z } from "zod"

export const UserRole = z.enum(["HOST", "PARTICIPANT"])
export type UserRole = z.infer<typeof UserRole>

export const SessionStatus = z.enum(["WAITING", "ACTIVE", "PAUSED", "ENDED"])
export type SessionStatus = z.infer<typeof SessionStatus>

export const QueueItemStatus = z.enum([
  "QUEUED",
  "PREPARING",
  "PERFORMING",
  "COMPLETED",
  "SKIPPED",
])
export type QueueItemStatus = z.infer<typeof QueueItemStatus>

export const KaraokeSessionConfigSchema = z.object({
  maxParticipants: z.number().int().min(0),
  prepareTimeSeconds: z.number().int().min(0),
  allowMultipleSongsPerUser: z.boolean(),
})
export type KaraokeSessionConfig = z.infer<typeof KaraokeSessionConfigSchema>

export const KaraokeSessionDto = z.object({
  id: z.string(),
  hostId: z.string(),
  name: z.string(),
  code: z.string().length(6),
  status: SessionStatus,
  config: KaraokeSessionConfigSchema,
  createdAt: z.string(),
  lastActivityAt: z.string(),
})
export type KaraokeSessionDto = z.infer<typeof KaraokeSessionDto>

export const ParticipantDto = z.object({
  id: z.string(),
  sessionId: z.string(),
  nickname: z.string(),
  role: UserRole,
  isConnected: z.boolean(),
  connectedAt: z.string(),
  lastActivityAt: z.string(),
})
export type ParticipantDto = z.infer<typeof ParticipantDto>

export const QueueItemSource = z.enum(["catalog", "free_text"])
export type QueueItemSource = z.infer<typeof QueueItemSource>

export const LyricsSource = z.enum(["lrclib", "manual"])
export type LyricsSource = z.infer<typeof LyricsSource>

export const CatalogTrackDto = z.object({
  id: z.string(),
  ownerId: z.string(),
  title: z.string(),
  artist: z.string(),
  filename: z.string(),
  durationSeconds: z.number().int().nullable(),
})
export type CatalogTrackDto = z.infer<typeof CatalogTrackDto>

export const QueueItemDto = z.object({
  id: z.string(),
  sessionId: z.string(),
  singerId: z.string(),
  singerNickname: z.string(),
  title: z.string(),
  artist: z.string().nullable(),
  trackId: z.string().nullable(),
  filename: z.string().nullable(),
  source: QueueItemSource,
  status: QueueItemStatus,
  position: z.number().int().nullable(),
  queuedAt: z.string(),
  startedAt: z.string().nullable(),
  actualStartedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
})
export type QueueItemDto = z.infer<typeof QueueItemDto>
