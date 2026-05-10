import { createAuthClient } from "better-auth/client"

export function createKaraokeAuthClient(baseUrl: string) {
  return createAuthClient({
    baseURL: baseUrl,
    fetchOptions: { credentials: "include" },
  })
}

export type KaraokeAuthClient = ReturnType<typeof createKaraokeAuthClient>
