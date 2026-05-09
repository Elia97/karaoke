import { sql } from "drizzle-orm"
import { createDbClient } from "@workspace/db/client"

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL required")

const db = createDbClient(url)

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS screen_pairing (
    id text PRIMARY KEY NOT NULL,
    screen_token text NOT NULL UNIQUE,
    pairing_code text NOT NULL,
    session_id text REFERENCES karaoke_session(id) ON DELETE CASCADE,
    host_id text REFERENCES "user"(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT now(),
    expires_at timestamp NOT NULL,
    paired_at timestamp
  )
`)

await db.execute(
  sql`CREATE INDEX IF NOT EXISTS screen_pairing_code_idx ON screen_pairing (pairing_code)`
)
await db.execute(
  sql`CREATE INDEX IF NOT EXISTS screen_pairing_session_idx ON screen_pairing (session_id)`
)

console.log("✓ screen_pairing table ready")
process.exit(0)
