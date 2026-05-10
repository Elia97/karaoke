const SERVER_URL = (
  process.env.EXPO_PUBLIC_SERVER_URL ?? "http://localhost:3000"
).replace(/\/+$/, "")

export const env = {
  serverUrl: SERVER_URL,
} as const
