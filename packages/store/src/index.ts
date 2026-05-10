import { Store } from "@tanstack/store"
import type {
  KaraokeSessionDto,
  ParticipantDto,
  QueueItemDto,
} from "@workspace/protocol/domain"
import type { ErrorCode } from "@workspace/protocol/errors"
import type { ServerEvent } from "@workspace/protocol/events"

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error"

export type PrepareNotification = {
  item: QueueItemDto
  secondsUntilTurn: number | null
  message: string
}

export type LastError = {
  code: ErrorCode | "TRANSPORT" | "UNKNOWN"
  message: string
}

export type LyricsSnapshot = {
  itemId: string
  actualStartedAtMs: number
  syncedLyrics: string | null
  plainLyrics: string | null
}

export type KaraokeState = {
  connectionStatus: ConnectionStatus
  protocolVersion: string | null
  participant: ParticipantDto | null
  session: KaraokeSessionDto | null
  participants: ParticipantDto[]
  queue: QueueItemDto[]
  currentSong: QueueItemDto | null
  lyrics: LyricsSnapshot | null
  participantToken: string | null
  hostDisconnectDeadlineMs: number | null
  prepareNotification: PrepareNotification | null
  lastError: LastError | null
}

const initialState: KaraokeState = {
  connectionStatus: "idle",
  protocolVersion: null,
  participant: null,
  session: null,
  participants: [],
  queue: [],
  currentSong: null,
  lyrics: null,
  participantToken: null,
  hostDisconnectDeadlineMs: null,
  prepareNotification: null,
  lastError: null,
}

export type KaraokeStore = ReturnType<typeof createKaraokeStore>

export function createKaraokeStore(seed: Partial<KaraokeState> = {}) {
  const store = new Store<KaraokeState>({ ...initialState, ...seed })

  function applyEvent(event: ServerEvent): void {
    switch (event.type) {
      case "welcome":
        store.setState((s) => ({
          ...s,
          protocolVersion: event.protocolVersion,
          participant: event.participant,
          session: event.session,
          participants: event.participants,
          queue: event.queue,
          currentSong: event.currentSong,
          participantToken:
            event.participantToken ?? s.participantToken ?? null,
        }))
        return
      case "userJoined":
        store.setState((s) => ({
          ...s,
          participants: upsertParticipant(s.participants, event.participant),
        }))
        return
      case "userLeft":
        store.setState((s) => ({
          ...s,
          participants: s.participants.map((p) =>
            p.id === event.participantId ? { ...p, isConnected: false } : p
          ),
        }))
        return
      case "queueUpdated":
        store.setState((s) => ({
          ...s,
          queue: event.queue,
          currentSong: event.currentSong,
        }))
        return
      case "nowPlaying":
        store.setState((s) => ({
          ...s,
          currentSong: event.item,
          lyrics: null,
          prepareNotification:
            s.prepareNotification?.item.id === event.item.id
              ? null
              : s.prepareNotification,
        }))
        return
      case "playbackStarted":
        store.setState((s) => ({
          ...s,
          currentSong:
            s.currentSong?.id === event.item.id ? event.item : s.currentSong,
          lyrics: {
            itemId: event.item.id,
            actualStartedAtMs: new Date(event.actualStartedAt).getTime(),
            syncedLyrics: event.lyrics?.syncedLyrics ?? null,
            plainLyrics: event.lyrics?.plainLyrics ?? null,
          },
        }))
        return
      case "prepare":
        store.setState((s) => ({
          ...s,
          prepareNotification: {
            item: event.item,
            secondsUntilTurn: event.secondsUntilTurn,
            message: event.message,
          },
        }))
        return
      case "hostDisconnected":
        store.setState((s) => ({
          ...s,
          hostDisconnectDeadlineMs: event.reconnectDeadlineMs,
        }))
        return
      case "hostReconnected":
        store.setState((s) => ({ ...s, hostDisconnectDeadlineMs: null }))
        return
      case "sessionPaused":
      case "sessionResumed":
        store.setState((s) => ({ ...s, session: event.session }))
        return
      case "sessionEnded":
        store.setState((s) => ({
          ...s,
          session: event.session,
          hostDisconnectDeadlineMs: null,
        }))
        return
      case "error":
        store.setState((s) => ({
          ...s,
          lastError: { code: event.code, message: event.message },
        }))
        return
    }
  }

  function setConnectionStatus(
    status: ConnectionStatus,
    info?: { reason?: string }
  ): void {
    store.setState((s) => ({
      ...s,
      connectionStatus: status,
      lastError:
        status === "error" && info?.reason
          ? { code: "TRANSPORT", message: info.reason }
          : s.lastError,
    }))
  }

  function clearError(): void {
    store.setState((s) => ({ ...s, lastError: null }))
  }

  function clearPrepareNotification(): void {
    store.setState((s) => ({ ...s, prepareNotification: null }))
  }

  function reset(): void {
    store.setState(() => ({ ...initialState }))
  }

  return {
    store,
    applyEvent,
    setConnectionStatus,
    clearError,
    clearPrepareNotification,
    reset,
  }
}

function upsertParticipant(
  list: ParticipantDto[],
  participant: ParticipantDto
): ParticipantDto[] {
  const idx = list.findIndex((p) => p.id === participant.id)
  if (idx === -1) return [...list, participant]
  const next = list.slice()
  next[idx] = participant
  return next
}
