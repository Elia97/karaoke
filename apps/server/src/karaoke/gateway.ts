import type { Server } from "socket.io"
import type { Auth } from "@workspace/auth/server"
import { JoinHandshake } from "@workspace/protocol/handshake"
import { PROTOCOL_VERSION } from "@workspace/protocol/version"
import type {
  UserJoinedEvent,
  UserLeftEvent,
  WelcomeEvent,
} from "@workspace/protocol/events"
import type { ErrorCode } from "@workspace/protocol/errors"
import { SearchTracksCommand } from "@workspace/protocol/commands"
import type { SearchTracksAck } from "@workspace/protocol/commands"
import { createParticipantToken, verifyParticipantToken } from "../utils/token"
import { deleteRoom, getOrCreateRoom, getRoom } from "./state"
import type { SessionService } from "./session.service"
import type { CatalogService } from "../catalog/catalog.service"

export type GatewayConfig = {
  io: Server
  auth: Auth
  sessions: SessionService
  catalog: CatalogService
  participantTokenSecret: string
}

type SocketData = {
  participantId: string
  sessionId: string
  role: "HOST" | "PARTICIPANT"
  userId: string | null
}

export function setupGateway(config: GatewayConfig): void {
  const ns = config.io.of("/karaoke")

  ns.use(async (socket, next) => {
    try {
      const handshake = JoinHandshake.parse(socket.handshake.auth)

      let hostUserId: string | null = null
      const cookies = socket.handshake.headers.cookie
      if (cookies) {
        try {
          const headers = new Headers()
          headers.set("cookie", cookies)
          const authResult = await config.auth.api.getSession({ headers })
          if (authResult?.user) hostUserId = authResult.user.id
        } catch {
          // ignore: fall through to participant
        }
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
          const verified = verifyParticipantToken(
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

    const sessionDto = await config.sessions.findById(sessionId)
    if (!sessionDto) {
      socket.disconnect(true)
      return
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

    const me = room.participants.get(participantId)
    if (!me) {
      socket.disconnect(true)
      return
    }

    socket.join(roomName(sessionId))

    const participantToken =
      role === "PARTICIPANT"
        ? createParticipantToken(
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

    const userJoined: UserJoinedEvent = { type: "userJoined", participant: me }
    socket.to(roomName(sessionId)).emit("userJoined", userJoined)

    socket.on(
      "searchTracks",
      async (payload: unknown, ack?: (response: SearchTracksAck) => void) => {
        if (typeof ack !== "function") return
        try {
          const cmd = SearchTracksCommand.parse(payload)
          const session = await config.sessions.findById(sessionId)
          if (!session) {
            ack({ ok: false, error: "SESSION_NOT_FOUND" })
            return
          }
          const tracks = await config.catalog.searchTracks({
            ownerId: session.hostId,
            query: cmd.query,
            limit: cmd.limit,
          })
          ack({ ok: true, tracks })
        } catch (e) {
          console.error("[gateway] searchTracks error", e)
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
        const userLeft: UserLeftEvent = {
          type: "userLeft",
          participantId,
          reason: "disconnected",
        }
        ns.to(roomName(sessionId)).emit("userLeft", userLeft)
        const stillConnected = [...r.participants.values()].some(
          (x) => x.isConnected
        )
        if (!stillConnected) deleteRoom(sessionId)
      } catch (e) {
        console.error("[gateway] disconnect error", e)
      }
    })
  })
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
