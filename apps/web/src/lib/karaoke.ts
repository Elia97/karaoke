import { createKaraokeStore } from '@workspace/store'
import { attachPersistence } from '@workspace/store/persist'
import { createTypedClient } from '@workspace/socket-client'

const STORAGE_KEY = 'karaoke:participant-token-v1'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? ''

export const karaokeStore = createKaraokeStore()
export const typedClient = createTypedClient({ url: SOCKET_URL })

export async function fetchHostToken(): Promise<string> {
  const res = await fetch('/api/auth/socket-token', {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to fetch host socket token')
  const json = (await res.json()) as { token: string }
  return json.token
}

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
