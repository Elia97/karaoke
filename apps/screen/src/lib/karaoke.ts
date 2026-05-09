import { createKaraokeStore } from '@workspace/store'
import { createTypedClient } from '@workspace/socket-client'
import { env } from './env'

const SCREEN_TOKEN_KEY = 'karaoke:screen-token-v1'

export function getOrCreateScreenToken(): string {
  if (typeof window === 'undefined') return ''
  let token = window.localStorage.getItem(SCREEN_TOKEN_KEY)
  if (!token) {
    token = crypto.randomUUID() + '-' + crypto.randomUUID()
    window.localStorage.setItem(SCREEN_TOKEN_KEY, token)
  }
  return token
}

export const karaokeStore = createKaraokeStore()
export const typedClient = createTypedClient({ url: env.serverUrl })

typedClient.onEvent((event) => karaokeStore.applyEvent(event))
typedClient.onConnectionStatus((status, info) =>
  karaokeStore.setConnectionStatus(status, info),
)
