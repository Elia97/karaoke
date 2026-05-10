import { useEffect, useMemo, useRef, useState } from 'react'
import type { LyricsSnapshot } from '@workspace/store'

type LrcLine = { timeMs: number; text: string }

const TIMESTAMP_RE = /\[(\d+):(\d+(?:\.\d+)?)\]/g

function parseLrc(content: string): LrcLine[] {
  const lines: LrcLine[] = []
  for (const raw of content.split(/\r?\n/)) {
    const stamps: number[] = []
    let lastIndex = 0
    for (const match of raw.matchAll(TIMESTAMP_RE)) {
      const min = Number(match[1])
      const sec = Number(match[2])
      if (Number.isFinite(min) && Number.isFinite(sec)) {
        stamps.push(Math.round((min * 60 + sec) * 1000))
        lastIndex = match.index + match[0].length
      }
    }
    if (stamps.length === 0) continue
    const text = raw.slice(lastIndex).trim()
    if (!text) continue
    for (const timeMs of stamps) lines.push({ timeMs, text })
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs)
}

export function LyricsScroll({ lyrics }: { lyrics: LyricsSnapshot }) {
  const lines = useMemo(
    () => (lyrics.syncedLyrics ? parseLrc(lyrics.syncedLyrics) : []),
    [lyrics.syncedLyrics],
  )
  const [currentIdx, setCurrentIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (lines.length === 0) return
    let raf = 0
    function tick() {
      const elapsedMs = Date.now() - lyrics.actualStartedAtMs
      let idx = 0
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].timeMs <= elapsedMs) idx = i
        else break
      }
      setCurrentIdx(idx)
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [lines, lyrics.actualStartedAtMs])

  useEffect(() => {
    const el = containerRef.current?.children[currentIdx] as
      | HTMLElement
      | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentIdx])

  if (lines.length === 0) {
    if (lyrics.plainLyrics) {
      return (
        <div className="prose prose-invert max-h-[60vh] overflow-auto text-3xl leading-relaxed">
          {lyrics.plainLyrics.split('\n').map((line, i) => (
            <p key={i}>{line || ' '}</p>
          ))}
        </div>
      )
    }
    return (
      <p className="text-2xl text-muted-foreground">
        Lyrics non disponibili per questo brano.
      </p>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex max-h-[70vh] flex-col items-center gap-3 overflow-auto py-12 text-center"
    >
      {lines.map((line, i) => (
        <p
          key={`${line.timeMs}-${i}`}
          className={
            i === currentIdx
              ? 'text-5xl font-bold text-foreground transition-all'
              : i === currentIdx - 1 || i === currentIdx + 1
                ? 'text-3xl text-muted-foreground'
                : 'text-2xl text-muted-foreground/40'
          }
        >
          {line.text}
        </p>
      ))}
    </div>
  )
}
