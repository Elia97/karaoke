import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Button } from '@workspace/ui/components/button'
import {
  useConnectionStatus,
  useCurrentSong,
  useLastError,
  usePrepareNotification,
  useQueue,
  useSession,
} from '@workspace/store/hooks'
import type { CatalogTrackDto } from '@workspace/protocol/domain'
import { useKaraoke } from '../components/karaoke-provider'

export const Route = createFileRoute('/session/$code')({
  component: SessionLive,
  validateSearch: z.object({ nickname: z.string().optional() }),
})

function SessionLive() {
  const { code } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const { store, client } = useKaraoke()
  const session = useSession(store)
  const queue = useQueue(store)
  const currentSong = useCurrentSong(store)
  const status = useConnectionStatus(store)
  const lastError = useLastError(store)
  const prepare = usePrepareNotification(store)

  useEffect(() => {
    if (!search.nickname) {
      void navigate({ to: '/join', search: { code } })
      return
    }
    const participantToken = store.store.state.participantToken ?? undefined
    client.connect({
      code,
      nickname: search.nickname,
      participantToken,
    })
    return () => {
      client.disconnect()
    }
  }, [code, search.nickname, client, navigate, store])

  useEffect(() => {
    if (session?.status === 'ENDED') {
      void navigate({ to: '/' })
    }
  }, [session, navigate])

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-5 bg-background p-6 text-foreground">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{session?.name ?? '...'}</h1>
        <p className="text-sm text-muted-foreground">
          Codice: <span className="font-mono">{code}</span> · Stato:{' '}
          {session?.status ?? '...'} · Connessione: {status}
        </p>
      </header>

      {prepare && prepare.item.singerNickname === search.nickname && (
        <div className="rounded-2xl border border-primary bg-primary/10 p-4">
          <p className="font-semibold">🎤 Tocca a te tra poco!</p>
          <p className="text-sm">{prepare.message}</p>
          <p className="text-xs text-muted-foreground">
            Brano: <strong>{prepare.item.title}</strong>
          </p>
        </div>
      )}

      {currentSong && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Sta cantando
          </h2>
          <p className="mt-2 text-2xl font-bold">{currentSong.title}</p>
          <p className="text-sm text-muted-foreground">
            {currentSong.artist ?? '—'} · {currentSong.singerNickname}
          </p>
        </section>
      )}

      <RequestSongCard />

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Coda ({queue.length})</h2>
        {queue.length === 0 ? (
          <p className="mt-3 text-muted-foreground">Coda vuota.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {queue.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-background p-3"
              >
                <p className="font-medium">
                  {item.position && (
                    <span className="mr-2 text-muted-foreground">
                      #{item.position}
                    </span>
                  )}
                  {item.title}{' '}
                  <span className="text-sm text-muted-foreground">
                    — {item.singerNickname}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">{item.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lastError && (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {lastError.code}: {lastError.message}
        </p>
      )}
    </main>
  )
}

function RequestSongCard() {
  const { client } = useKaraoke()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogTrackDto[]>([])
  const [searching, setSearching] = useState(false)
  const [requesting, setRequesting] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [showFreeText, setShowFreeText] = useState(false)
  const [freeTitle, setFreeTitle] = useState('')

  async function onSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setInfo(null)
    try {
      const ack = await client.searchTracks({ query, limit: 20 })
      if (ack.ok) setResults(ack.tracks)
      else setInfo(`Errore: ${ack.error}`)
    } finally {
      setSearching(false)
    }
  }

  async function onPick(track: CatalogTrackDto) {
    setRequesting(track.id)
    try {
      const ack = await client.requestSong({
        title: track.title,
        artist: track.artist,
        trackId: track.id,
        filename: track.filename,
        source: 'catalog',
      })
      if (ack.ok) setInfo(`In coda: ${track.title}`)
      else setInfo(`Errore: ${ack.error}`)
    } finally {
      setRequesting(null)
    }
  }

  async function onFreeText(e: React.FormEvent) {
    e.preventDefault()
    if (!freeTitle.trim()) return
    const ack = await client.requestSong({
      title: freeTitle.trim(),
      source: 'free_text',
    })
    if (ack.ok) {
      setInfo(`In coda: ${freeTitle}`)
      setFreeTitle('')
      setShowFreeText(false)
    } else setInfo(`Errore: ${ack.error}`)
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">Richiedi un brano</h2>
      <form onSubmit={onSearch} className="mt-3 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca titolo o artista..."
          className="flex-1 rounded-lg border border-border bg-background p-2"
        />
        <Button type="submit" disabled={searching || !query}>
          {searching ? '...' : 'Cerca'}
        </Button>
      </form>

      {results.length > 0 && (
        <ul className="mt-4 max-h-72 space-y-1 overflow-auto">
          {results.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-border p-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{t.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.artist}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => onPick(t)}
                disabled={requesting === t.id}
              >
                {requesting === t.id ? '...' : 'Richiedi'}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        {!showFreeText ? (
          <button
            type="button"
            onClick={() => setShowFreeText(true)}
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Non trovi il brano? Inserisci titolo libero
          </button>
        ) : (
          <form onSubmit={onFreeText} className="flex gap-2">
            <input
              type="text"
              value={freeTitle}
              onChange={(e) => setFreeTitle(e.target.value)}
              maxLength={200}
              placeholder="Titolo brano"
              className="flex-1 rounded-lg border border-border bg-background p-2"
            />
            <Button type="submit" disabled={!freeTitle}>
              Aggiungi
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowFreeText(false)}
            >
              Annulla
            </Button>
          </form>
        )}
      </div>

      {info && <p className="mt-3 text-sm text-muted-foreground">{info}</p>}
    </section>
  )
}
