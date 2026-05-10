import { createKaraokeAuthClient } from '@workspace/auth/client'

const authBaseUrl =
  typeof window === 'undefined'
    ? 'http://localhost:5173'
    : window.location.origin

export const authClient = createKaraokeAuthClient(authBaseUrl)
