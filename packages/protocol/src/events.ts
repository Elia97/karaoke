import { z } from "zod"
import { KaraokeSessionDto, ParticipantDto, QueueItemDto } from "./domain"
import { PROTOCOL_VERSION } from "./version"
import { ErrorEvent } from "./errors"

export const WelcomeEvent = z.object({
  type: z.literal("welcome"),
  protocolVersion: z.literal(PROTOCOL_VERSION),
  participant: ParticipantDto,
  session: KaraokeSessionDto,
  participants: z.array(ParticipantDto),
  queue: z.array(QueueItemDto),
  currentSong: QueueItemDto.nullable(),
  participantToken: z.string().nullable(),
})
export type WelcomeEvent = z.infer<typeof WelcomeEvent>

export const UserJoinedEvent = z.object({
  type: z.literal("userJoined"),
  participant: ParticipantDto,
})
export type UserJoinedEvent = z.infer<typeof UserJoinedEvent>

export const UserLeftEvent = z.object({
  type: z.literal("userLeft"),
  participantId: z.string(),
  reason: z.enum(["disconnected", "kicked", "timeout"]),
})
export type UserLeftEvent = z.infer<typeof UserLeftEvent>

export const QueueUpdatedEvent = z.object({
  type: z.literal("queueUpdated"),
  queue: z.array(QueueItemDto),
  currentSong: QueueItemDto.nullable(),
  changeType: z.enum(["added", "removed", "advanced", "reordered"]),
})
export type QueueUpdatedEvent = z.infer<typeof QueueUpdatedEvent>

export const NowPlayingEvent = z.object({
  type: z.literal("nowPlaying"),
  item: QueueItemDto,
  nextUp: QueueItemDto.nullable(),
})
export type NowPlayingEvent = z.infer<typeof NowPlayingEvent>

export const PrepareEvent = z.object({
  type: z.literal("prepare"),
  item: QueueItemDto,
  message: z.string(),
  secondsUntilTurn: z.number().int().nullable(),
})
export type PrepareEvent = z.infer<typeof PrepareEvent>

export const PlaybackStartedEvent = z.object({
  type: z.literal("playbackStarted"),
  item: QueueItemDto,
  actualStartedAt: z.string(),
  lyrics: z
    .object({
      syncedLyrics: z.string().nullable(),
      plainLyrics: z.string().nullable(),
    })
    .nullable(),
})
export type PlaybackStartedEvent = z.infer<typeof PlaybackStartedEvent>

export const HostDisconnectedEvent = z.object({
  type: z.literal("hostDisconnected"),
  reconnectDeadlineMs: z.number(),
  reconnectWindowSeconds: z.number().int(),
})
export type HostDisconnectedEvent = z.infer<typeof HostDisconnectedEvent>

export const HostReconnectedEvent = z.object({
  type: z.literal("hostReconnected"),
})
export type HostReconnectedEvent = z.infer<typeof HostReconnectedEvent>

export const SessionPausedEvent = z.object({
  type: z.literal("sessionPaused"),
  session: KaraokeSessionDto,
})
export type SessionPausedEvent = z.infer<typeof SessionPausedEvent>

export const SessionResumedEvent = z.object({
  type: z.literal("sessionResumed"),
  session: KaraokeSessionDto,
})
export type SessionResumedEvent = z.infer<typeof SessionResumedEvent>

export const SessionEndReason = z.enum(["host_timeout", "manual", "host_left"])
export type SessionEndReason = z.infer<typeof SessionEndReason>

export const SessionEndedEvent = z.object({
  type: z.literal("sessionEnded"),
  session: KaraokeSessionDto,
  reason: SessionEndReason,
})
export type SessionEndedEvent = z.infer<typeof SessionEndedEvent>

export const ServerEvent = z.discriminatedUnion("type", [
  WelcomeEvent,
  UserJoinedEvent,
  UserLeftEvent,
  QueueUpdatedEvent,
  NowPlayingEvent,
  PrepareEvent,
  PlaybackStartedEvent,
  HostDisconnectedEvent,
  HostReconnectedEvent,
  SessionPausedEvent,
  SessionResumedEvent,
  SessionEndedEvent,
  ErrorEvent,
])
export type ServerEvent = z.infer<typeof ServerEvent>
