import { z } from "zod"

export const ErrorCode = z.enum([
  "UNAUTHENTICATED",
  "SESSION_NOT_FOUND",
  "SESSION_ENDED",
  "NICKNAME_TAKEN",
  "INVALID_NICKNAME",
  "INVALID_HANDSHAKE",
  "INVALID_TOKEN",
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
