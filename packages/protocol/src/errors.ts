import { z } from 'zod'

export const ErrorCode = z.enum(['UNKNOWN'])
export type ErrorCode = z.infer<typeof ErrorCode>

export const ErrorEvent = z.object({
  type: z.literal('error'),
  code: ErrorCode,
  message: z.string(),
})
export type ErrorEvent = z.infer<typeof ErrorEvent>
