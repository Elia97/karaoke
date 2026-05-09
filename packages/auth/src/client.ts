import { createAuthClient } from 'better-auth/client'

export function createKaraokeAuthClient(baseUrl: string) {
  return createAuthClient({ baseURL: baseUrl })
}

export type KaraokeAuthClient = ReturnType<typeof createKaraokeAuthClient>
