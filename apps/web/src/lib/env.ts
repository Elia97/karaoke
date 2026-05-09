const SERVER_URL = (
  import.meta.env.VITE_SERVER_URL as string | undefined
)?.replace(/\/+$/, '')

if (!SERVER_URL) {
  throw new Error(
    'Missing VITE_SERVER_URL. Set it in apps/web/.env (default http://localhost:3000)',
  )
}

export const env = {
  serverUrl: SERVER_URL,
} as const
