import { XMLParser } from "fast-xml-parser"
import { basename } from "node:path"
import type { CatalogParseResult, ParsedTrack } from "./types"

type RawSong = {
  "@_FilePath"?: string
  Tags?: {
    "@_Author"?: string
    "@_Title"?: string
  }
  Infos?: {
    "@_SongLength"?: string | number
  }
}

type RawDatabase = {
  VirtualDJ_Database?: {
    Song?: RawSong | RawSong[]
  }
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  isArray: (name) => name === "Song",
})

export function parseVirtualDjXml(content: string): CatalogParseResult {
  const parsed = xmlParser.parse(content) as RawDatabase
  const songs = parsed.VirtualDJ_Database?.Song
  if (!songs || !Array.isArray(songs)) {
    return { tracks: [], skipped: 0 }
  }

  const tracks: ParsedTrack[] = []
  let skipped = 0

  for (const song of songs) {
    const filePath = song["@_FilePath"]?.trim()
    const title = song.Tags?.["@_Title"]?.trim()
    const artist = song.Tags?.["@_Author"]?.trim()

    if (!filePath || !title || !artist) {
      skipped++
      continue
    }

    const filename = basename(filePath)
    const lengthRaw = song.Infos?.["@_SongLength"]
    const durationSeconds = parseDuration(lengthRaw)

    tracks.push({ title, artist, filename, durationSeconds })
  }

  return { tracks, skipped }
}

function parseDuration(raw: string | number | undefined): number | null {
  if (raw === undefined) return null
  const n = typeof raw === "number" ? raw : Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}
