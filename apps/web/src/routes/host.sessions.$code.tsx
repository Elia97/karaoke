import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@workspace/ui/components/button'
import {
  useConnectionStatus,
  useCurrentSong,
  useNextSinger,
  useParticipants,
  useQueue,
  useSession,
} from '@workspace/store/hooks'
import { useKaraoke } from '../components/karaoke-provider'

export const Route = createFileRoute('/host/sessions/$code')({
  component: HostSessionLive,
})

function HostSessionLive() {
  const { code } = Route.useParams()
  const navigate = useNavigate()
  const { store, client } = useKaraoke()
  const session = useSession(store)
  const queue = useQueue(store)
  const currentSong = useCurrentSong(store)
  const nextSinger = useNextSinger(store)
  const participants = useParticipants(store)
  const status = useConnectionStatus(store)

  useEffect(() => {
    client.connect({ code })
    return () => {
      client.disconnect()
    }
  }, [code, client])

  useEffect(() => {
    if (session?.status === 'ENDED') {
      void navigate({ to: '/host' })
    }
  }, [session, navigate])

  async function onNextSong() {
    await client.nextSong()
  }
  async function onPause() {
    await client.pauseSession()
  }
  async function onResume() {
    await client.resumeSession()
  }
  async function onEnd() {
    if (!confirm("Terminare la sessione? Non si potra' tornare indietro.")) {
      return
    }
    await client.endSession()
    void navigate({ to: '/host' })
  }
  async function onRemove(itemId: string) {
    await client.removeSong({ queueItemId: itemId })
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-6 bg-background p-8 text-foreground">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{session?.name ?? 'Sessione'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Codice:{' '}
            <span className="font-mono text-base font-bold text-foreground">
              {code}
            </span>{' '}
            · Stato: {session?.status ?? '...'} · Connessione: {status} ·{' '}
            {participants.filter((p) => p.isConnected).length} partecipanti
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onPause}>
            Pausa
          </Button>
          <Button size="sm" variant="outline" onClick={onResume}>
            Riprendi
          </Button>
          <Button size="sm" variant="destructive" onClick={onEnd}>
            Termina
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/host">Indietro</Link>
          </Button>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Ora sta cantando</h2>
        {currentSong ? (
          <div className="mt-3 space-y-1">
            <p className="text-2xl font-bold">{currentSong.title}</p>
            <p className="text-sm text-muted-foreground">
              {currentSong.artist ?? '—'} · {currentSong.singerNickname}
              {currentSong.filename && (
                <span className="ml-2 font-mono text-xs">
                  ({currentSong.filename})
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-muted-foreground">Nessuno sta cantando.</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {currentSong && !currentSong.actualStartedAt && (
            <Button
              variant="default"
              onClick={async () => {
                await client.startPlayback({ queueItemId: currentSong.id })
              }}
            >
              ▶ Avvia lyrics
            </Button>
          )}
          {currentSong?.actualStartedAt && (
            <span className="text-sm text-muted-foreground">
              Lyrics avviate alle{' '}
              {new Date(currentSong.actualStartedAt).toLocaleTimeString(
                'it-IT',
              )}
            </span>
          )}
          <Button onClick={onNextSong}>Prossimo brano</Button>
          {nextSinger && (
            <p className="text-sm text-muted-foreground">
              Prossimo: <strong>{nextSinger.singerNickname}</strong> —{' '}
              {nextSinger.title}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Coda ({queue.length})</h2>
        {queue.length === 0 ? (
          <p className="mt-3 text-muted-foreground">Nessun brano in coda.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {queue.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
              >
                <div>
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
                  <p className="text-xs text-muted-foreground">
                    {item.status} · {item.source}
                    {item.filename && ` · ${item.filename}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(item.id)}
                >
                  Rimuovi
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
