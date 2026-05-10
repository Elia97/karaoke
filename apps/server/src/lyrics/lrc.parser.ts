export type LrcLine = {
  timeMs: number
  text: string
}

const TIMESTAMP_RE = /\[(\d+):(\d+(?:\.\d+)?)\]/g

export function parseLrc(content: string): LrcLine[] {
  const lines: LrcLine[] = []
  for (const raw of content.split(/\r?\n/)) {
    const stamps: number[] = []
    let lastIndex = 0
    for (const match of raw.matchAll(TIMESTAMP_RE)) {
      const min = Number(match[1])
      const sec = Number(match[2])
      if (Number.isFinite(min) && Number.isFinite(sec)) {
        stamps.push(Math.round((min * 60 + sec) * 1000))
        lastIndex = (match.index ?? 0) + match[0].length
      }
    }
    if (stamps.length === 0) continue
    const text = raw.slice(lastIndex).trim()
    if (!text) continue
    for (const timeMs of stamps) {
      lines.push({ timeMs, text })
    }
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs)
}
