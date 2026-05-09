import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  customType,
  index,
} from "drizzle-orm/pg-core"
import { user } from "./auth"

export const sessionStatus = pgEnum("session_status", [
  "WAITING",
  "ACTIVE",
  "PAUSED",
  "ENDED",
])

export const participantRole = pgEnum("participant_role", [
  "HOST",
  "PARTICIPANT",
])

export const lyricsSource = pgEnum("lyrics_source", ["lrclib", "manual"])

export type KaraokeSessionConfig = {
  maxParticipants: number
  prepareTimeSeconds: number
  allowMultipleSongsPerUser: boolean
}

export const karaokeSession = pgTable("karaoke_session", {
  id: text("id").primaryKey(),
  hostId: text("host_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  status: sessionStatus("status").notNull().default("WAITING"),
  config: jsonb("config").$type<KaraokeSessionConfig>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
})

export const participant = pgTable("participant", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => karaokeSession.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  role: participantRole("role").notNull(),
  participantToken: text("participant_token"),
  isConnected: boolean("is_connected").notNull().default(true),
  socketId: text("socket_id"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
})

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector"
  },
})

export const catalogTrack = pgTable(
  "catalog_track",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    filename: text("filename").notNull(),
    durationSeconds: integer("duration_seconds"),
    searchVector: tsvector("search_vector").notNull(),
    lyricsSource: lyricsSource("lyrics_source"),
    lyricsLrc: text("lyrics_lrc"),
    lyricsPlain: text("lyrics_plain"),
    lyricsFetchedAt: timestamp("lyrics_fetched_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("catalog_track_search_idx").using("gin", table.searchVector),
    index("catalog_track_owner_idx").on(table.ownerId),
  ]
)
