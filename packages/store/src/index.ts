import { Store } from '@tanstack/store'

export type KaraokeState = Record<string, unknown>

export const createKaraokeStore = () => new Store<KaraokeState>({})
export type KaraokeStore = ReturnType<typeof createKaraokeStore>
