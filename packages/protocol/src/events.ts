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

export const ServerEvent = z.discriminatedUnion("type", [
  WelcomeEvent,
  UserJoinedEvent,
  UserLeftEvent,
  ErrorEvent,
])
export type ServerEvent = z.infer<typeof ServerEvent>
