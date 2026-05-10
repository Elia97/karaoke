import { createHmac, timingSafeEqual } from "node:crypto"

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

export type WithExpiry<T> = T & { exp: number }

export function createSignedToken<T extends object>(
  payload: T,
  secret: string,
  ttlMs: number = DEFAULT_TTL_MS
): string {
  const full: WithExpiry<T> = { ...payload, exp: Date.now() + ttlMs }
  const payloadB64 = Buffer.from(JSON.stringify(full)).toString("base64url")
  const signature = createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url")
  return `${payloadB64}.${signature}`
}

export function verifySignedToken<T extends object>(
  token: string,
  secret: string
): WithExpiry<T> | null {
  const [payloadB64, signature] = token.split(".")
  if (!payloadB64 || !signature) return null

  const expected = createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url")
  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length) return null
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null

  let payload: WithExpiry<T>
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    ) as WithExpiry<T>
  } catch {
    return null
  }
  if (payload.exp < Date.now()) return null
  return payload
}

export type ParticipantTokenPayload = {
  participantId: string
  sessionId: string
}

export type HostTokenPayload = {
  userId: string
}
