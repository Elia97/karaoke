import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

export function createDbClient(url: string) {
  const sql = postgres(url, { max: 10 })
  return drizzle(sql)
}

export type DbClient = ReturnType<typeof createDbClient>
