import { createKaraokeAuthClient } from '@workspace/auth/client'

export const authClient = createKaraokeAuthClient(window.location.origin)
