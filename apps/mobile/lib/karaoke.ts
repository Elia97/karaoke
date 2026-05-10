import * as SecureStore from "expo-secure-store"
import { createKaraokeStore } from "@workspace/store"
import type { StorageAdapter } from "@workspace/store/persist"
import { attachPersistence } from "@workspace/store/persist"
import { createTypedClient } from "@workspace/socket-client"
import { env } from "./env"

const STORAGE_KEY = "karaoke-participant-token-v1"

const secureStorage: StorageAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
}

export const karaokeStore = createKaraokeStore()
export const typedClient = createTypedClient({
  url: env.serverUrl,
  withCredentials: false,
})

typedClient.onEvent((event) => karaokeStore.applyEvent(event))
typedClient.onConnectionStatus((status, info) =>
  karaokeStore.setConnectionStatus(status, info)
)

attachPersistence({
  store: karaokeStore,
  storage: secureStorage,
  key: STORAGE_KEY,
  pick: (state) => ({ participantToken: state.participantToken }),
})
