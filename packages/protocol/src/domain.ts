import { z } from 'zod'

export const UserRole = z.enum(['HOST', 'PARTICIPANT'])
export type UserRole = z.infer<typeof UserRole>

export const SessionStatus = z.enum(['WAITING', 'ACTIVE', 'PAUSED', 'ENDED'])
export type SessionStatus = z.infer<typeof SessionStatus>

export const QueueItemStatus = z.enum([
  'QUEUED',
  'PREPARING',
  'PERFORMING',
  'COMPLETED',
  'SKIPPED',
])
export type QueueItemStatus = z.infer<typeof QueueItemStatus>
