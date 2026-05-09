import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { describe, expect, test } from "vitest"
import { parseVirtualDjXml } from "./virtualdj-xml.parser"

const here = dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(
  join(here, "__fixtures__", "virtualdj.sample.xml"),
  "utf-8"
)

describe("parseVirtualDjXml", () => {
  test("parses well-formed songs", () => {
    const result = parseVirtualDjXml(fixture)
    expect(result.tracks).toHaveLength(3)
    expect(result.skipped).toBe(2)
  })

  test("extracts title, artist, filename and duration", () => {
    const result = parseVirtualDjXml(fixture)
    expect(result.tracks[0]).toEqual({
      title: "Bohemian Rhapsody",
      artist: "Queen",
      filename: "queen-bohemian-rhapsody.mp3",
      durationSeconds: 354,
    })
  })

  test("uses basename of cross-platform paths", () => {
    const result = parseVirtualDjXml(fixture)
    const battisti = result.tracks.find((t) => t.artist === "Lucio Battisti")
    expect(battisti?.filename).toBe("lucio_battisti-il_mio_canto_libero.mp3")
  })

  test("returns empty array for empty database", () => {
    const empty = `<?xml version="1.0"?><VirtualDJ_Database></VirtualDJ_Database>`
    expect(parseVirtualDjXml(empty)).toEqual({ tracks: [], skipped: 0 })
  })

  test("skips songs with missing title or artist", () => {
    const result = parseVirtualDjXml(fixture)
    const titles = result.tracks.map((t) => t.title)
    expect(titles).not.toContain("Solo Title")
  })
})
