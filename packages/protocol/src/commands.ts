import { z } from 'zod'

export const Command = z.object({ type: z.string() })
export type Command = z.infer<typeof Command>
