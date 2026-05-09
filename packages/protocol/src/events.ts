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

export const ServerEvent = z.discriminatedUnion("type", [
  WelcomeEvent,
  UserJoinedEvent,
  UserLeftEvent,
  QueueUpdatedEvent,
  NowPlayingEvent,
  PrepareEvent,
  ErrorEvent,
])
export type ServerEvent = z.infer<typeof ServerEvent>
