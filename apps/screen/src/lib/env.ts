const SERVER_URL = (
  import.meta.env.VITE_SERVER_URL as string | undefined
)?.replace(/\/+$/, '')

const PARTICIPANT_JOIN_URL = (
  import.meta.env.VITE_PARTICIPANT_JOIN_URL as string | undefined
)?.replace(/\/+$/, '')

if (!SERVER_URL) {
  throw new Error('Missing VITE_SERVER_URL in apps/screen/.env')
}
if (!PARTICIPANT_JOIN_URL) {
  throw new Error('Missing VITE_PARTICIPANT_JOIN_URL in apps/screen/.env')
}

export const env = {
  serverUrl: SERVER_URL,
  participantJoinUrl: PARTICIPANT_JOIN_URL,
} as const
