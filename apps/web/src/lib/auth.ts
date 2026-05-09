import { createKaraokeAuthClient } from '@workspace/auth/client'
import { env } from './env'

export const authClient = createKaraokeAuthClient(env.serverUrl)
