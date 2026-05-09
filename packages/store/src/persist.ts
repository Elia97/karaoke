import type { KaraokeStore, KaraokeState } from "./index"

export type StorageAdapter = {
  getItem: (key: string) => string | null | Promise<string | null>
  setItem: (key: string, value: string) => void | Promise<void>
  removeItem: (key: string) => void | Promise<void>
}

export type AttachPersistenceConfig = {
  store: KaraokeStore
  storage: StorageAdapter
  key: string
  pick: (state: KaraokeState) => Partial<KaraokeState>
}

export function attachPersistence(config: AttachPersistenceConfig): () => void {
  const { store, storage, key, pick } = config

  void Promise.resolve(storage.getItem(key)).then((raw) => {
    if (!raw) return
    try {
      const partial = JSON.parse(raw) as Partial<KaraokeState>
      store.store.setState((current) => ({ ...current, ...partial }))
    } catch {
      // ignore corrupt payload
    }
  })

  return store.store.subscribe(() => {
    const partial = pick(store.store.state)
    void Promise.resolve(storage.setItem(key, JSON.stringify(partial))).catch(
      (err) => console.warn("[persist] setItem failed", err)
    )
  })
}
