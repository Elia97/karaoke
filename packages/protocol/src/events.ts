import { z } from 'zod'

export const Event = z.object({ type: z.string() })
export type Event = z.infer<typeof Event>
