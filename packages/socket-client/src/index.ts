import { io, type Socket } from "socket.io-client"
import type { JoinHandshake } from "@workspace/protocol/handshake"
import type { ServerEvent } from "@workspace/protocol/events"
import type {
  NextSongAck,
  RemoveSongAck,
  RemoveSongCommand,
  RequestSongAck,
  RequestSongCommand,
  SearchTracksAck,
  SearchTracksCommand,
  SessionLifecycleAck,
} from "@workspace/protocol/commands"

const SERVER_EVENT_TYPES: ReadonlyArray<ServerEvent["type"]> = [
  "welcome",
  "userJoined",
  "userLeft",
  "queueUpdated",
  "nowPlaying",
  "prepare",
  "hostDisconnected",
  "hostReconnected",
  "sessionPaused",
  "sessionResumed",
  "sessionEnded",
  "error",
]

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error"

export type ConnectionStatusListener = (
  status: ConnectionStatus,
  info?: { reason?: string }
) => void

export type EventListener = (event: ServerEvent) => void

export type CreateClientConfig = {
  url: string
  withCredentials?: boolean
}

export type TypedClient = {
  socket: Socket
  connect: (handshake: JoinHandshake) => void
  disconnect: () => void
  onEvent: (listener: EventListener) => () => void
  onConnectionStatus: (listener: ConnectionStatusListener) => () => void
  searchTracks: (
    cmd: Omit<SearchTracksCommand, "type">
  ) => Promise<SearchTracksAck>
  requestSong: (
    cmd: Omit<RequestSongCommand, "type">
  ) => Promise<RequestSongAck>
  removeSong: (cmd: Omit<RemoveSongCommand, "type">) => Promise<RemoveSongAck>
  nextSong: () => Promise<NextSongAck>
  pauseSession: () => Promise<SessionLifecycleAck>
  resumeSession: () => Promise<SessionLifecycleAck>
  endSession: () => Promise<SessionLifecycleAck>
}

export function createTypedClient(config: CreateClientConfig): TypedClient {
  const socket: Socket = io(`${config.url}/karaoke`, {
    autoConnect: false,
    withCredentials: config.withCredentials ?? true,
    transports: ["websocket", "polling"],
  })

  const eventListeners = new Set<EventListener>()
  const statusListeners = new Set<ConnectionStatusListener>()

  function broadcastEvent(event: ServerEvent): void {
    for (const l of eventListeners) l(event)
  }

  function emitStatus(
    status: ConnectionStatus,
    info?: { reason?: string }
  ): void {
    for (const l of statusListeners) l(status, info)
  }

  for (const type of SERVER_EVENT_TYPES) {
    socket.on(type, (payload: ServerEvent) => broadcastEvent(payload))
  }

  socket.on("connect", () => emitStatus("connected"))
  socket.on("disconnect", (reason: string) =>
    emitStatus("disconnected", { reason })
  )
  socket.on("connect_error", (err: Error) =>
    emitStatus("error", { reason: err.message })
  )
  socket.io.on("reconnect_attempt", () => emitStatus("reconnecting"))
  socket.io.on("reconnect", () => emitStatus("connected"))

  return {
    socket,
    connect(handshake) {
      socket.auth = { ...handshake } as Record<string, unknown>
      emitStatus("connecting")
      socket.connect()
    },
    disconnect() {
      socket.disconnect()
    },
    onEvent(listener) {
      eventListeners.add(listener)
      return () => {
        eventListeners.delete(listener)
      }
    },
    onConnectionStatus(listener) {
      statusListeners.add(listener)
      return () => {
        statusListeners.delete(listener)
      }
    },
    searchTracks(cmd) {
      return socket.emitWithAck("searchTracks", {
        type: "searchTracks",
        ...cmd,
      })
    },
    requestSong(cmd) {
      return socket.emitWithAck("requestSong", {
        type: "requestSong",
        ...cmd,
      })
    },
    removeSong(cmd) {
      return socket.emitWithAck("removeSong", {
        type: "removeSong",
        ...cmd,
      })
    },
    nextSong() {
      return socket.emitWithAck("nextSong", { type: "nextSong" })
    },
    pauseSession() {
      return socket.emitWithAck("pauseSession", { type: "pauseSession" })
    },
    resumeSession() {
      return socket.emitWithAck("resumeSession", { type: "resumeSession" })
    },
    endSession() {
      return socket.emitWithAck("endSession", { type: "endSession" })
    },
  }
}
