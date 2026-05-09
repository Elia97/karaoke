import { z } from "zod"

export const NicknameSchema = z
  .string()
  .min(2)
  .max(30)
  .regex(/^[a-zA-Z0-9_]+$/)

export const SessionCodeSchema = z
  .string()
  .length(6)
  .regex(/^[A-Z0-9]+$/)

export const JoinHandshake = z.object({
  code: SessionCodeSchema.optional(),
  nickname: NicknameSchema.optional(),
  participantToken: z.string().optional(),
})
export type JoinHandshake = z.infer<typeof JoinHandshake>
