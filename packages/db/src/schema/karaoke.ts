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

export const queueItemStatus = pgEnum("queue_item_status", [
  "QUEUED",
  "PREPARING",
  "PERFORMING",
  "COMPLETED",
  "SKIPPED",
])

export const queueItemSource = pgEnum("queue_item_source", [
  "catalog",
  "free_text",
])

export const pendingActionType = pgEnum("pending_action_type", [
  "END_SESSION_ON_HOST_TIMEOUT",
])

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

export const queueItem = pgTable(
  "queue_item",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => karaokeSession.id, { onDelete: "cascade" }),
    singerId: text("singer_id")
      .notNull()
      .references(() => participant.id, { onDelete: "cascade" }),
    singerNickname: text("singer_nickname").notNull(),
    title: text("title").notNull(),
    artist: text("artist"),
    trackId: text("track_id").references(() => catalogTrack.id, {
      onDelete: "set null",
    }),
    filename: text("filename"),
    source: queueItemSource("source").notNull(),
    status: queueItemStatus("status").notNull().default("QUEUED"),
    position: integer("position"),
    queuedAt: timestamp("queued_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    actualStartedAt: timestamp("actual_started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("queue_item_session_idx").on(table.sessionId),
    index("queue_item_session_status_idx").on(table.sessionId, table.status),
  ]
)

export const screenPairing = pgTable(
  "screen_pairing",
  {
    id: text("id").primaryKey(),
    screenToken: text("screen_token").notNull().unique(),
    pairingCode: text("pairing_code").notNull(),
    sessionId: text("session_id").references(() => karaokeSession.id, {
      onDelete: "cascade",
    }),
    hostId: text("host_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    pairedAt: timestamp("paired_at"),
  },
  (table) => [
    index("screen_pairing_code_idx").on(table.pairingCode),
    index("screen_pairing_session_idx").on(table.sessionId),
  ]
)

export const pendingAction = pgTable(
  "pending_action",
  {
    id: text("id").primaryKey(),
    type: pendingActionType("type").notNull(),
    sessionId: text("session_id")
      .notNull()
      .references(() => karaokeSession.id, { onDelete: "cascade" }),
    executeAt: timestamp("execute_at").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("pending_action_execute_idx").on(table.executeAt),
    index("pending_action_session_idx").on(table.sessionId),
  ]
)
