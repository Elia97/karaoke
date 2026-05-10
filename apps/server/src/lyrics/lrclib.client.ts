const LRCLIB_BASE = "https://lrclib.net/api/get"

export type LrclibResponse = {
  syncedLyrics: string | null
  plainLyrics: string | null
}

export async function fetchLrclibLyrics(input: {
  artist: string
  title: string
  durationSeconds?: number | null
}): Promise<LrclibResponse | null> {
  const params = new URLSearchParams()
  params.set("artist_name", input.artist)
  params.set("track_name", input.title)
  if (input.durationSeconds && input.durationSeconds > 0) {
    params.set("duration", String(input.durationSeconds))
  }
  const url = `${LRCLIB_BASE}?${params.toString()}`
  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "KaraokeApp/1.0 (https://github.com/anthropics/claude-code)",
      },
    })
  } catch (e) {
    console.warn("[lrclib] fetch failed", e)
    return null
  }
  if (res.status === 404) return null
  if (!res.ok) return null
  const json = (await res.json()) as {
    syncedLyrics?: string | null
    plainLyrics?: string | null
  }
  return {
    syncedLyrics: json.syncedLyrics ?? null,
    plainLyrics: json.plainLyrics ?? null,
  }
}
