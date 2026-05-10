import { createContext, useContext } from "react"
import type { ReactNode } from "react"
import { karaokeStore, typedClient } from "../lib/karaoke"
import type { KaraokeStore } from "@workspace/store"
import type { TypedClient } from "@workspace/socket-client"

type KaraokeContextValue = {
  store: KaraokeStore
  client: TypedClient
}

const KaraokeContext = createContext<KaraokeContextValue | null>(null)

export function KaraokeProvider({ children }: { children: ReactNode }) {
  return (
    <KaraokeContext.Provider
      value={{ store: karaokeStore, client: typedClient }}
    >
      {children}
    </KaraokeContext.Provider>
  )
}

export function useKaraoke(): KaraokeContextValue {
  const ctx = useContext(KaraokeContext)
  if (!ctx) throw new Error("useKaraoke must be used within KaraokeProvider")
  return ctx
}
