import { createKaraokeStore } from '@workspace/store'
import { attachPersistence } from '@workspace/store/persist'
import { createTypedClient } from '@workspace/socket-client'
import { env } from './env'

const STORAGE_KEY = 'karaoke:participant-token-v1'

export const karaokeStore = createKaraokeStore()
export const typedClient = createTypedClient({ url: env.serverUrl })

typedClient.onEvent((event) => karaokeStore.applyEvent(event))
typedClient.onConnectionStatus((status, info) =>
  karaokeStore.setConnectionStatus(status, info),
)

if (typeof window !== 'undefined') {
  attachPersistence({
    store: karaokeStore,
    storage: window.localStorage,
    key: STORAGE_KEY,
    pick: (state) => ({ participantToken: state.participantToken }),
  })
}
