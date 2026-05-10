import { eq, sql } from "drizzle-orm"
import { createDbClient } from "@workspace/db/client"
import * as schema from "@workspace/db/schema"
import { createCatalogService } from "../src/catalog/catalog.service"

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL required")

const db = createDbClient(url)
const catalog = createCatalogService(db)

const [firstUser] = await db.select().from(schema.user).limit(1)
if (!firstUser) {
  throw new Error(
    "Nessun utente trovato — fai login almeno una volta prima di seedare"
  )
}

console.log(`Seeding catalog for user: ${firstUser.email} (${firstUser.id})`)

await catalog.clearByOwner(firstUser.id)

const tracks = [
  {
    title: "Bohemian Rhapsody",
    artist: "Queen",
    filename: "queen-bohemian-rhapsody.mp3",
    durationSeconds: 354,
  },
  {
    title: "Il mio canto libero",
    artist: "Lucio Battisti",
    filename: "battisti-canto-libero.mp3",
    durationSeconds: 252,
  },
  {
    title: "I Will Always Love You",
    artist: "Whitney Houston",
    filename: "whitney-i-will-always.m4a",
    durationSeconds: 273,
  },
  {
    title: "Sweet Child O' Mine",
    artist: "Guns N' Roses",
    filename: "gnr-sweet-child.mp3",
    durationSeconds: 356,
  },
  {
    title: "La canzone del sole",
    artist: "Lucio Battisti",
    filename: "battisti-sole.mp3",
    durationSeconds: 248,
  },
  {
    title: "Don't Stop Believin'",
    artist: "Journey",
    filename: "journey-dont-stop.mp3",
    durationSeconds: 251,
  },
  {
    title: "Wonderwall",
    artist: "Oasis",
    filename: "oasis-wonderwall.mp3",
    durationSeconds: 258,
  },
  {
    title: "Albachiara",
    artist: "Vasco Rossi",
    filename: "vasco-albachiara.mp3",
    durationSeconds: 280,
  },
]

const result = await catalog.bulkInsertTracks({ ownerId: firstUser.id, tracks })
console.log(`Inserite ${result.count} tracce.`)

const [{ count }] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(schema.catalogTrack)
  .where(eq(schema.catalogTrack.ownerId, firstUser.id))
console.log(`Totale catalog_track per owner: ${count}`)

process.exit(0)
