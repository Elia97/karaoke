import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { describe, expect, test } from "vitest"
import { parseJsonCatalog } from "./json.parser"

const here = dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(join(here, "__fixtures__", "sample.json"), "utf-8")

describe("parseJsonCatalog", () => {
  test("parses valid JSON catalog", () => {
    const result = parseJsonCatalog(fixture)
    expect(result.tracks).toHaveLength(3)
    expect(result.skipped).toBe(0)
  })

  test("accepts both `duration` and `durationSeconds` keys", () => {
    const result = parseJsonCatalog(fixture)
    expect(result.tracks[0]?.durationSeconds).toBe(354)
    expect(result.tracks[1]?.durationSeconds).toBe(248)
  })

  test("returns null duration when missing", () => {
    const result = parseJsonCatalog(fixture)
    expect(result.tracks[2]?.durationSeconds).toBeNull()
  })

  test("throws on invalid payload (missing field)", () => {
    expect(() =>
      parseJsonCatalog(JSON.stringify([{ title: "no artist or filename" }]))
    ).toThrow(/Invalid JSON catalog payload/)
  })

  test("throws on non-array root", () => {
    expect(() => parseJsonCatalog("{}")).toThrow(/Invalid JSON catalog payload/)
  })

  test("trims whitespace in values", () => {
    const result = parseJsonCatalog(
      JSON.stringify([
        { title: "  Hello  ", artist: " World ", filename: " file.mp3 " },
      ])
    )
    expect(result.tracks[0]).toMatchObject({
      title: "Hello",
      artist: "World",
      filename: "file.mp3",
    })
  })
})
