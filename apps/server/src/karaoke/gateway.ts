import type { Server } from "socket.io"
import { z } from "zod"
import { JoinHandshake } from "@workspace/protocol/handshake"
import { PROTOCOL_VERSION } from "@workspace/protocol/version"
import type {
  HostDisconnectedEvent,
  HostReconnectedEvent,
  NowPlayingEvent,
  PlaybackStartedEvent,
  PrepareEvent,
  QueueUpdatedEvent,
  SessionEndedEvent,
  SessionEndReason,
  SessionPausedEvent,
  SessionResumedEvent,
  UserJoinedEvent,
  UserLeftEvent,
  WelcomeEvent,
} from "@workspace/protocol/events"
import type { ErrorCode } from "@workspace/protocol/errors"
import {
  RemoveSongCommand,
  RequestSongCommand,
  SearchTracksCommand,
  StartPlaybackCommand,
} from "@workspace/protocol/commands"
import type {
  NextSongAck,
  RemoveSongAck,
  RequestSongAck,
  SearchTracksAck,
  SessionLifecycleAck,
  StartPlaybackAck,
} from "@workspace/protocol/commands"
import type { QueueItemDto } from "@workspace/protocol/domain"
import {
  createSignedToken,
  verifySignedToken,
  type HostTokenPayload,
  type ParticipantTokenPayload,
} from "../utils/token"
import { deleteRoom, getOrCreateRoom, getRoom } from "./state"
import type { SessionService } from "./session.service"
import type { CatalogService } from "../catalog/catalog.service"
import type { QueueService } from "../queue/queue.service"
import { ActiveSongError, ForbiddenError } from "../queue/queue.service"
import type {
  PendingActionDto,
  PendingActionsService,
} from "../lifecycle/pending-actions.service"
import type { ScreenPairingService } from "../screen/screen-pairing.service"
import type { LyricsService } from "../lyrics/lyrics.service"

export type GatewayConfig = {
  io: Server
  sessions: SessionService
  catalog: CatalogService
  queue: QueueService
  pendingActions: PendingActionsService
  screenPairing: ScreenPairingService
  lyrics: LyricsService
  participantTokenSecret: string
  hostReconnectWindowSeconds?: number
}

export type Gateway = {
  executePendingAction: (action: PendingActionDto) => Promise<void>
}

type SocketData = {
  participantId: string
  sessionId: string
  role: "HOST" | "PARTICIPANT" | "SCREEN"
  userId: string | null
}

export function setupGateway(config: GatewayConfig): Gateway {
  const ns = config.io.of("/karaoke")
  const hostReconnectWindowSeconds = config.hostReconnectWindowSeconds ?? 300

  ns.use(async (socket, next) => {
    try {
      const handshake = JoinHandshake.parse(socket.handshake.auth)

      let hostUserId: string | null = null
      if (handshake.hostToken) {
        const verified = verifySignedToken<HostTokenPayload>(
          handshake.hostToken,
          config.participantTokenSecret
        )
        if (verified) hostUserId = verified.userId
      }

      if (handshake.screenToken) {
        const pairing = await config.screenPairing.findByToken(
          handshake.screenToken
        )
        if (!pairing || !pairing.sessionId || !pairing.pairedAt) {
          return rejectWithError(
            next,
            "INVALID_HANDSHAKE",
            "Screen non ancora paired"
          )
        }
        const session = await config.sessions.findById(pairing.sessionId)
        if (!session) {
          return rejectWithError(next, "SESSION_NOT_FOUND", "Session not found")
        }
        if (session.status === "ENDED") {
          return rejectWithError(next, "SESSION_ENDED", "Session has ended")
        }
        const data = socket.data as SocketData
        // Screen is in-memory only (no participant DB record); id derives from pairing
        data.participantId = `screen:${pairing.id}`
        data.sessionId = session.id
        data.role = "SCREEN"
        data.userId = null
        return next()
      }

      if (!handshake.code) {
        return rejectWithError(
          next,
          "INVALID_HANDSHAKE",
          "Missing session code"
        )
      }
      const code = handshake.code.toUpperCase()
      const session = await config.sessions.findByCode(code)
      if (!session) {
        return rejectWithError(next, "SESSION_NOT_FOUND", "Session not found")
      }
      if (session.status === "ENDED") {
        return rejectWithError(next, "SESSION_ENDED", "Session has ended")
      }

      const data = socket.data as SocketData
      const existing = await config.sessions.listParticipants(session.id)

      if (hostUserId && hostUserId === session.hostId) {
        const hostRow = existing.find((p) => p.role === "HOST")
        const participant = await config.sessions.upsertParticipant({
          id: hostRow?.id,
          sessionId: session.id,
          nickname: hostRow?.nickname ?? "Host",
          role: "HOST",
        })
        data.participantId = participant.id
        data.role = "HOST"
        data.userId = hostUserId
      } else {
        let reusedId: string | undefined
        if (handshake.participantToken) {
          const verified = verifySignedToken<ParticipantTokenPayload>(
            handshake.participantToken,
            config.participantTokenSecret
          )
          if (verified && verified.sessionId === session.id) {
            reusedId = verified.participantId
          }
        }
        if (!handshake.nickname) {
          return rejectWithError(
            next,
            "INVALID_NICKNAME",
            "Nickname required for participant"
          )
        }
        const conflict = existing.find(
          (p) =>
            p.nickname === handshake.nickname &&
            p.isConnected &&
            p.id !== reusedId
        )
        if (conflict) {
          return rejectWithError(
            next,
            "NICKNAME_TAKEN",
            "Nickname already in use in this session"
          )
        }
        const participant = await config.sessions.upsertParticipant({
          id: reusedId,
          sessionId: session.id,
          nickname: handshake.nickname,
          role: "PARTICIPANT",
        })
        data.participantId = participant.id
        data.role = "PARTICIPANT"
        data.userId = null
      }
      data.sessionId = session.id
      next()
    } catch (e) {
      console.error("[gateway] handshake error", e)
      rejectWithError(next, "INTERNAL", "Internal error during handshake")
    }
  })

  ns.on("connection", async (socket) => {
    const data = socket.data as SocketData
    const { participantId, sessionId, role } = data

    // Force-disconnect any other socket for the same participant (race protection on rejoin)
    const allSockets = await ns.fetchSockets()
    for (const other of allSockets) {
      if (
        other.id !== socket.id &&
        (other.data as SocketData).participantId === participantId
      ) {
        other.disconnect(true)
      }
    }

    let sessionDto = await config.sessions.findById(sessionId)
    if (!sessionDto) {
      socket.disconnect(true)
      return
    }

    // Host reconnect: cancel pending END_SESSION timeout + resume if paused
    let hostJustReconnected = false
    if (role === "HOST") {
      const cancelled = await config.pendingActions.cancelBySession({
        sessionId,
        type: "END_SESSION_ON_HOST_TIMEOUT",
      })
      if (cancelled > 0) hostJustReconnected = true
      if (sessionDto.status === "PAUSED") {
        const resumed = await config.sessions.resumeSession(sessionId)
        if (resumed) sessionDto = resumed
      }
    }

    const participants = await config.sessions.listParticipants(sessionId)
    const room = getOrCreateRoom(sessionId, () => ({
      session: sessionDto,
      participants: new Map(),
      queue: [],
      currentSong: null,
    }))
    room.session = sessionDto
    room.participants = new Map(participants.map((p) => [p.id, p]))

    let me = room.participants.get(participantId)
    if (!me && role === "SCREEN") {
      const now = new Date().toISOString()
      me = {
        id: participantId,
        sessionId,
        nickname: `Screen-${participantId.slice(7, 13)}`,
        role: "SCREEN",
        isConnected: true,
        connectedAt: now,
        lastActivityAt: now,
      }
    }
    if (!me) {
      socket.disconnect(true)
      return
    }

    const fullQueue = await config.queue.listBySession(sessionId)
    room.queue = fullQueue.filter(
      (q) => q.status !== "COMPLETED" && q.status !== "SKIPPED"
    )
    room.currentSong = fullQueue.find((q) => q.status === "PERFORMING") ?? null

    socket.join(roomName(sessionId))

    const participantToken =
      role === "PARTICIPANT"
        ? createSignedToken<ParticipantTokenPayload>(
            { participantId, sessionId },
            config.participantTokenSecret
          )
        : null

    const welcome: WelcomeEvent = {
      type: "welcome",
      protocolVersion: PROTOCOL_VERSION,
      participant: me,
      session: room.session,
      participants: [...room.participants.values()],
      queue: room.queue,
      currentSong: room.currentSong,
      participantToken,
    }
    socket.emit("welcome", welcome)

    if (hostJustReconnected) {
      const hostReconnected: HostReconnectedEvent = { type: "hostReconnected" }
      ns.to(roomName(sessionId)).emit("hostReconnected", hostReconnected)
      const sessionResumed: SessionResumedEvent = {
        type: "sessionResumed",
        session: room.session,
      }
      socket.to(roomName(sessionId)).emit("sessionResumed", sessionResumed)
    } else {
      const userJoined: UserJoinedEvent = {
        type: "userJoined",
        participant: me,
      }
      socket.to(roomName(sessionId)).emit("userJoined", userJoined)
    }

    socket.on(
      "searchTracks",
      async (payload: unknown, ack?: (response: SearchTracksAck) => void) => {
        if (typeof ack !== "function") return
        try {
          const cmd = SearchTracksCommand.parse(payload)
          const sess = await config.sessions.findById(sessionId)
          if (!sess) {
            ack({ ok: false, error: "SESSION_NOT_FOUND" })
            return
          }
          const tracks = await config.catalog.searchTracks({
            ownerId: sess.hostId,
            query: cmd.query,
            limit: cmd.limit,
          })
          ack({ ok: true, tracks })
        } catch (e) {
          if (e instanceof z.ZodError) {
            ack({ ok: false, error: "INVALID_PAYLOAD" })
            return
          }
          console.error("[gateway] searchTracks error", e)
          ack({ ok: false, error: "INTERNAL" })
        }
      }
    )

    socket.on(
      "requestSong",
      async (payload: unknown, ack?: (response: RequestSongAck) => void) => {
        if (typeof ack !== "function") return
        try {
          if (role === "SCREEN") {
            ack({ ok: false, error: "FORBIDDEN" })
            return
          }
          const cmd = RequestSongCommand.parse(payload)
          const sess = await config.sessions.findById(sessionId)
          if (!sess) {
            ack({ ok: false, error: "SESSION_NOT_FOUND" })
            return
          }
          if (sess.status === "ENDED") {
            ack({ ok: false, error: "SESSION_ENDED" })
            return
          }
          const item = await config.queue.requestSong(
            {
              sessionId,
              singerId: participantId,
              singerNickname: me.nickname,
              title: cmd.title,
              artist: cmd.artist ?? null,
              trackId: cmd.trackId ?? null,
              filename: cmd.filename ?? null,
              source: cmd.source,
            },
            {
              allowMultipleSongsPerUser:
                sess.config.allowMultipleSongsPerUser || role === "HOST",
            }
          )
          ack({ ok: true, item })
          await broadcastQueueUpdated(sessionId, "added")
        } catch (e) {
          if (e instanceof ActiveSongError) {
            ack({ ok: false, error: "ACTIVE_SONG_EXISTS" })
            return
          }
          if (e instanceof z.ZodError) {
            ack({ ok: false, error: "INVALID_PAYLOAD" })
            return
          }
          console.error("[gateway] requestSong error", e)
          ack({ ok: false, error: "INTERNAL" })
        }
      }
    )

    socket.on(
      "removeSong",
      async (payload: unknown, ack?: (response: RemoveSongAck) => void) => {
        if (typeof ack !== "function") return
        try {
          if (role === "SCREEN") {
            ack({ ok: false, error: "FORBIDDEN" })
            return
          }
          const cmd = RemoveSongCommand.parse(payload)
          const removed = await config.queue.removeSong({
            sessionId,
            queueItemId: cmd.queueItemId,
            requesterParticipantId: participantId,
            requesterRole: role,
          })
          if (!removed) {
            ack({ ok: false, error: "ITEM_NOT_FOUND" })
            return
          }
          ack({ ok: true })
          await broadcastQueueUpdated(sessionId, "removed")
        } catch (e) {
          if (e instanceof ForbiddenError) {
            ack({ ok: false, error: "FORBIDDEN" })
            return
          }
          if (e instanceof z.ZodError) {
            ack({ ok: false, error: "INVALID_PAYLOAD" })
            return
          }
          console.error("[gateway] removeSong error", e)
          ack({ ok: false, error: "INTERNAL" })
        }
      }
    )

    socket.on(
      "nextSong",
      async (_payload: unknown, ack?: (response: NextSongAck) => void) => {
        if (typeof ack !== "function") return
        try {
          if (role !== "HOST") {
            ack({ ok: false, error: "FORBIDDEN" })
            return
          }
          const sess = await config.sessions.findById(sessionId)
          if (!sess) {
            ack({ ok: false, error: "SESSION_NOT_FOUND" })
            return
          }
          if (sess.status === "ENDED") {
            ack({ ok: false, error: "SESSION_ENDED" })
            return
          }
          const result = await config.queue.advanceQueue(sessionId)
          ack({ ok: true })
          if (result.nowPlaying) {
            const evt: NowPlayingEvent = {
              type: "nowPlaying",
              item: result.nowPlaying,
              nextUp: result.prepare,
            }
            ns.to(roomName(sessionId)).emit("nowPlaying", evt)
          }
          if (result.prepare) {
            const evt: PrepareEvent = {
              type: "prepare",
              item: result.prepare,
              message: "You're up next!",
              secondsUntilTurn: sess.config.prepareTimeSeconds ?? null,
            }
            ns.to(roomName(sessionId)).emit("prepare", evt)
          }
          await broadcastQueueUpdated(sessionId, "advanced")
        } catch (e) {
          console.error("[gateway] nextSong error", e)
          ack({ ok: false, error: "INTERNAL" })
        }
      }
    )

    socket.on(
      "startPlayback",
      async (payload: unknown, ack?: (response: StartPlaybackAck) => void) => {
        if (typeof ack !== "function") return
        try {
          if (role !== "HOST") {
            ack({ ok: false, error: "FORBIDDEN" })
            return
          }
          const cmd = StartPlaybackCommand.parse(payload)
          const updated = await config.queue.startPlayback({
            sessionId,
            queueItemId: cmd.queueItemId,
          })
          if (!updated || !updated.actualStartedAt) {
            ack({ ok: false, error: "ITEM_NOT_FOUND" })
            return
          }
          ack({ ok: true })
          let lyrics: PlaybackStartedEvent["lyrics"] = null
          if (updated.trackId) {
            const result = await config.lyrics.getLyricsForTrack(
              updated.trackId
            )
            if (result) {
              lyrics = {
                syncedLyrics: result.syncedLyrics,
                plainLyrics: result.plainLyrics,
              }
            }
          }
          const evt: PlaybackStartedEvent = {
            type: "playbackStarted",
            item: updated,
            actualStartedAt: updated.actualStartedAt,
            lyrics,
          }
          ns.to(roomName(sessionId)).emit("playbackStarted", evt)
        } catch (e) {
          if (e instanceof z.ZodError) {
            ack({ ok: false, error: "INVALID_PAYLOAD" })
            return
          }
          console.error("[gateway] startPlayback error", e)
          ack({ ok: false, error: "INTERNAL" })
        }
      }
    )

    socket.on(
      "pauseSession",
      async (
        _payload: unknown,
        ack?: (response: SessionLifecycleAck) => void
      ) => {
        if (typeof ack !== "function") return
        try {
          if (role !== "HOST") {
            ack({ ok: false, error: "FORBIDDEN" })
            return
          }
          const updated = await config.sessions.pauseSession(sessionId)
          if (!updated) {
            ack({ ok: false, error: "SESSION_NOT_FOUND" })
            return
          }
          ack({ ok: true })
          const evt: SessionPausedEvent = {
            type: "sessionPaused",
            session: updated,
          }
          ns.to(roomName(sessionId)).emit("sessionPaused", evt)
        } catch (e) {
          console.error("[gateway] pauseSession error", e)
          ack({ ok: false, error: "INTERNAL" })
        }
      }
    )

    socket.on(
      "resumeSession",
      async (
        _payload: unknown,
        ack?: (response: SessionLifecycleAck) => void
      ) => {
        if (typeof ack !== "function") return
        try {
          if (role !== "HOST") {
            ack({ ok: false, error: "FORBIDDEN" })
            return
          }
          const updated = await config.sessions.resumeSession(sessionId)
          if (!updated) {
            ack({ ok: false, error: "SESSION_NOT_FOUND" })
            return
          }
          ack({ ok: true })
          const evt: SessionResumedEvent = {
            type: "sessionResumed",
            session: updated,
          }
          ns.to(roomName(sessionId)).emit("sessionResumed", evt)
        } catch (e) {
          console.error("[gateway] resumeSession error", e)
          ack({ ok: false, error: "INTERNAL" })
        }
      }
    )

    socket.on(
      "endSession",
      async (
        _payload: unknown,
        ack?: (response: SessionLifecycleAck) => void
      ) => {
        if (typeof ack !== "function") return
        try {
          if (role !== "HOST") {
            ack({ ok: false, error: "FORBIDDEN" })
            return
          }
          await config.pendingActions.cancelBySession({
            sessionId,
            type: "END_SESSION_ON_HOST_TIMEOUT",
          })
          const updated = await config.sessions.endSession(sessionId)
          if (!updated) {
            ack({ ok: false, error: "SESSION_NOT_FOUND" })
            return
          }
          ack({ ok: true })
          await emitSessionEnded(sessionId, updated, "manual")
        } catch (e) {
          console.error("[gateway] endSession error", e)
          ack({ ok: false, error: "INTERNAL" })
        }
      }
    )

    socket.on("disconnect", async () => {
      try {
        const r = getRoom(sessionId)
        if (!r) return
        const p = r.participants.get(participantId)
        if (!p) return
        r.participants.set(participantId, { ...p, isConnected: false })
        await config.sessions.markParticipantDisconnected(participantId)

        if (role === "HOST") {
          const paused = await config.sessions.pauseSession(sessionId)
          if (paused) {
            r.session = paused
            const executeAt = new Date(
              Date.now() + hostReconnectWindowSeconds * 1000
            )
            await config.pendingActions.schedule({
              type: "END_SESSION_ON_HOST_TIMEOUT",
              sessionId,
              executeAt,
            })
            const hostDisconnected: HostDisconnectedEvent = {
              type: "hostDisconnected",
              reconnectDeadlineMs: executeAt.getTime(),
              reconnectWindowSeconds: hostReconnectWindowSeconds,
            }
            ns.to(roomName(sessionId)).emit(
              "hostDisconnected",
              hostDisconnected
            )
            const sessionPaused: SessionPausedEvent = {
              type: "sessionPaused",
              session: paused,
            }
            ns.to(roomName(sessionId)).emit("sessionPaused", sessionPaused)
          }
        } else {
          const userLeft: UserLeftEvent = {
            type: "userLeft",
            participantId,
            reason: "disconnected",
          }
          ns.to(roomName(sessionId)).emit("userLeft", userLeft)
        }

        const stillConnected = [...r.participants.values()].some(
          (x) => x.isConnected
        )
        if (!stillConnected && role !== "HOST") deleteRoom(sessionId)
      } catch (e) {
        console.error("[gateway] disconnect error", e)
      }
    })
  })

  async function broadcastQueueUpdated(
    sessionId: string,
    changeType: QueueUpdatedEvent["changeType"]
  ): Promise<void> {
    const queue = await config.queue.listBySession(sessionId)
    const active = queue.filter(
      (q) => q.status !== "COMPLETED" && q.status !== "SKIPPED"
    )
    const currentSong: QueueItemDto | null =
      queue.find((q) => q.status === "PERFORMING") ?? null
    const room = getRoom(sessionId)
    if (room) {
      room.queue = active
      room.currentSong = currentSong
    }
    const event: QueueUpdatedEvent = {
      type: "queueUpdated",
      queue: active,
      currentSong,
      changeType,
    }
    ns.to(roomName(sessionId)).emit("queueUpdated", event)
  }

  async function emitSessionEnded(
    sessionId: string,
    session: SessionEndedEvent["session"],
    reason: SessionEndReason
  ): Promise<void> {
    const evt: SessionEndedEvent = {
      type: "sessionEnded",
      session,
      reason,
    }
    ns.to(roomName(sessionId)).emit("sessionEnded", evt)
    deleteRoom(sessionId)
    const sockets = await ns.in(roomName(sessionId)).fetchSockets()
    for (const s of sockets) s.disconnect(true)
  }

  async function executePendingAction(action: PendingActionDto): Promise<void> {
    if (action.type === "END_SESSION_ON_HOST_TIMEOUT") {
      const ended = await config.sessions.endSession(action.sessionId)
      if (ended) await emitSessionEnded(action.sessionId, ended, "host_timeout")
    }
  }

  return { executePendingAction }
}

function roomName(sessionId: string): string {
  return `session:${sessionId}`
}

function rejectWithError(
  next: (err?: Error) => void,
  code: ErrorCode,
  message: string
): void {
  const error = new Error(message) as Error & { data?: { code: ErrorCode } }
  error.data = { code }
  next(error)
}
