import { useStore } from "@tanstack/react-store"
import type { KaraokeStore, KaraokeState } from "./index"

type Selector<T> = (state: KaraokeState) => T

function useKaraokeSelector<T>(s: KaraokeStore, selector: Selector<T>): T {
  return useStore(s.store, selector)
}

export const useConnectionStatus = (s: KaraokeStore) =>
  useKaraokeSelector(s, (state) => state.connectionStatus)

export const useParticipant = (s: KaraokeStore) =>
  useKaraokeSelector(s, (state) => state.participant)

export const useSession = (s: KaraokeStore) =>
  useKaraokeSelector(s, (state) => state.session)

export const useParticipants = (s: KaraokeStore) =>
  useKaraokeSelector(s, (state) => state.participants)

export const useConnectedParticipants = (s: KaraokeStore) =>
  useKaraokeSelector(s, (state) =>
    state.participants.filter((p) => p.isConnected)
  )

export const useQueue = (s: KaraokeStore) =>
  useKaraokeSelector(s, (state) => state.queue)

export const useCurrentSong = (s: KaraokeStore) =>
  useKaraokeSelector(s, (state) => state.currentSong)

export const useNextSinger = (s: KaraokeStore) =>
  useKaraokeSelector(
    s,
    (state) => state.queue.find((q) => q.status === "PREPARING") ?? null
  )

export const useIsHost = (s: KaraokeStore) =>
  useKaraokeSelector(s, (state) => state.participant?.role === "HOST")

export const usePrepareNotification = (s: KaraokeStore) =>
  useKaraokeSelector(s, (state) => state.prepareNotification)

export const useHostDisconnectDeadline = (s: KaraokeStore) =>
  useKaraokeSelector(s, (state) => state.hostDisconnectDeadlineMs)

export const useLastError = (s: KaraokeStore) =>
  useKaraokeSelector(s, (state) => state.lastError)

export const useParticipantToken = (s: KaraokeStore) =>
  useKaraokeSelector(s, (state) => state.participantToken)

export const useLyrics = (s: KaraokeStore) =>
  useKaraokeSelector(s, (state) => state.lyrics)
