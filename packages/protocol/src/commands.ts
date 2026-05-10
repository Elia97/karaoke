import { z } from "zod"
import { CatalogTrackDto, QueueItemDto, QueueItemSource } from "./domain"
import { ErrorCode } from "./errors"

export const SearchTracksCommand = z.object({
  type: z.literal("searchTracks"),
  query: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(50).default(20),
})
export type SearchTracksCommand = z.infer<typeof SearchTracksCommand>

export const RequestSongCommand = z.object({
  type: z.literal("requestSong"),
  title: z.string().min(1).max(200),
  artist: z.string().max(200).nullable().optional(),
  trackId: z.string().nullable().optional(),
  filename: z.string().max(500).nullable().optional(),
  source: QueueItemSource,
})
export type RequestSongCommand = z.infer<typeof RequestSongCommand>

export const RemoveSongCommand = z.object({
  type: z.literal("removeSong"),
  queueItemId: z.string(),
})
export type RemoveSongCommand = z.infer<typeof RemoveSongCommand>

export const NextSongCommand = z.object({
  type: z.literal("nextSong"),
})
export type NextSongCommand = z.infer<typeof NextSongCommand>

export const StartPlaybackCommand = z.object({
  type: z.literal("startPlayback"),
  queueItemId: z.string(),
})
export type StartPlaybackCommand = z.infer<typeof StartPlaybackCommand>

export const PauseSessionCommand = z.object({
  type: z.literal("pauseSession"),
})
export type PauseSessionCommand = z.infer<typeof PauseSessionCommand>

export const ResumeSessionCommand = z.object({
  type: z.literal("resumeSession"),
})
export type ResumeSessionCommand = z.infer<typeof ResumeSessionCommand>

export const EndSessionCommand = z.object({
  type: z.literal("endSession"),
})
export type EndSessionCommand = z.infer<typeof EndSessionCommand>

export const ClientCommand = z.discriminatedUnion("type", [
  SearchTracksCommand,
  RequestSongCommand,
  RemoveSongCommand,
  NextSongCommand,
  StartPlaybackCommand,
  PauseSessionCommand,
  ResumeSessionCommand,
  EndSessionCommand,
])
export type ClientCommand = z.infer<typeof ClientCommand>

export const SearchTracksAck = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), tracks: z.array(CatalogTrackDto) }),
  z.object({ ok: z.literal(false), error: ErrorCode }),
])
export type SearchTracksAck = z.infer<typeof SearchTracksAck>

export const RequestSongAck = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), item: QueueItemDto }),
  z.object({ ok: z.literal(false), error: ErrorCode }),
])
export type RequestSongAck = z.infer<typeof RequestSongAck>

export const RemoveSongAck = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: ErrorCode }),
])
export type RemoveSongAck = z.infer<typeof RemoveSongAck>

export const NextSongAck = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: ErrorCode }),
])
export type NextSongAck = z.infer<typeof NextSongAck>

export const SessionLifecycleAck = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: ErrorCode }),
])
export type SessionLifecycleAck = z.infer<typeof SessionLifecycleAck>

export const StartPlaybackAck = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: ErrorCode }),
])
export type StartPlaybackAck = z.infer<typeof StartPlaybackAck>
