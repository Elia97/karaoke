import { z } from "zod"

export const ErrorCode = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "SESSION_NOT_FOUND",
  "SESSION_ENDED",
  "NICKNAME_TAKEN",
  "INVALID_NICKNAME",
  "INVALID_HANDSHAKE",
  "INVALID_TOKEN",
  "INVALID_PAYLOAD",
  "ACTIVE_SONG_EXISTS",
  "ITEM_NOT_FOUND",
  "INTERNAL",
  "UNKNOWN",
])
export type ErrorCode = z.infer<typeof ErrorCode>

export const ErrorEvent = z.object({
  type: z.literal("error"),
  code: ErrorCode,
  message: z.string(),
})
export type ErrorEvent = z.infer<typeof ErrorEvent>
