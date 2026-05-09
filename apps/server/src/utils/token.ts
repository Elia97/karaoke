import { createHmac, timingSafeEqual } from "node:crypto"

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export type ParticipantTokenPayload = {
  participantId: string
  sessionId: string
  exp: number
}

export function createParticipantToken(
  payload: Omit<ParticipantTokenPayload, "exp">,
  secret: string
): string {
  const fullPayload: ParticipantTokenPayload = {
    ...payload,
    exp: Date.now() + TOKEN_TTL_MS,
  }
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString(
    "base64url"
  )
  const signature = createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url")
  return `${payloadB64}.${signature}`
}

export function verifyParticipantToken(
  token: string,
  secret: string
): ParticipantTokenPayload | null {
  const [payloadB64, signature] = token.split(".")
  if (!payloadB64 || !signature) return null

  const expected = createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url")
  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length) return null
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null

  let payload: ParticipantTokenPayload
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    ) as ParticipantTokenPayload
  } catch {
    return null
  }
  if (payload.exp < Date.now()) return null
  return payload
}
