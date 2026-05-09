import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  useConnectionStatus,
  useCurrentSong,
  useNextSinger,
  useQueue,
  useSession,
} from '@workspace/store/hooks'
import { getOrCreateScreenToken } from '../lib/karaoke'
import { useKaraoke } from '../components/karaoke-provider'
import { env } from '../lib/env'

export const Route = createFileRoute('/live')({ component: ScreenLive })

function ScreenLive() {
  const navigate = useNavigate()
  const { store, client } = useKaraoke()
  const session = useSession(store)
  const queue = useQueue(store)
  const currentSong = useCurrentSong(store)
  const nextSinger = useNextSinger(store)
  const status = useConnectionStatus(store)
  const [pointerHidden, setPointerHidden] = useState(false)

  useEffect(() => {
    const token = getOrCreateScreenToken()
    if (!token) {
      void navigate({ to: '/' })
      return
    }
    client.connect({ screenToken: token })
    return () => client.disconnect()
  }, [client, navigate])

  useEffect(() => {
    if (session?.status === 'ENDED') {
      void navigate({ to: '/' })
    }
  }, [session, navigate])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    function reset() {
      setPointerHidden(false)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setPointerHidden(true), 3000)
    }
    reset()
    window.addEventListener('mousemove', reset)
    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('mousemove', reset)
    }
  }, [])

  async function onFullscreenToggle() {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  }

  const isIdle = !currentSong && queue.length === 0

  return (
    <main
      className={`min-h-screen bg-background text-foreground ${pointerHidden ? 'cursor-none' : ''}`}
    >
      <button
        type="button"
        onClick={onFullscreenToggle}
        className="absolute top-4 right-4 rounded-md border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
      >
        Fullscreen
      </button>

      {isIdle ? (
        <IdleScreensaver sessionCode={session?.code ?? null} />
      ) : (
        <Tabellone
          currentSong={currentSong}
          nextSinger={nextSinger}
          queue={queue}
          sessionStatus={session?.status ?? '...'}
          connectionStatus={status}
        />
      )}
    </main>
  )
}

function IdleScreensaver({ sessionCode }: { sessionCode: string | null }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12 p-12">
      <span className="text-9xl">🎤</span>
      <h1 className="text-7xl font-bold tracking-tight">Pronti a cantare?</h1>
      {sessionCode && (
        <p className="text-3xl text-muted-foreground">
          Codice sessione:{' '}
          <span className="font-mono text-5xl font-bold text-foreground">
            {sessionCode}
          </span>
        </p>
      )}
      <p className="max-w-2xl text-center text-2xl text-muted-foreground">
        Apri{' '}
        <span className="font-mono text-foreground">
          {env.participantJoinUrl}
        </span>{' '}
        e inserisci il codice
      </p>
    </div>
  )
}

type TabelloneProps = {
  currentSong: ReturnType<typeof useCurrentSong>
  nextSinger: ReturnType<typeof useNextSinger>
  queue: ReturnType<typeof useQueue>
  sessionStatus: string
  connectionStatus: string
}

function Tabellone(props: TabelloneProps) {
  const { currentSong, nextSinger, queue } = props
  return (
    <div className="grid min-h-screen grid-cols-3 gap-6 p-12">
      <section className="col-span-2 flex flex-col justify-between rounded-3xl border border-border bg-card p-12">
        <div>
          <p className="text-2xl font-medium uppercase tracking-widest text-muted-foreground">
            Sta cantando
          </p>
          {currentSong ? (
            <>
              <h1 className="mt-6 text-7xl font-bold leading-tight">
                {currentSong.title}
              </h1>
              <p className="mt-4 text-3xl text-muted-foreground">
                {currentSong.artist ?? '—'}
              </p>
              <p className="mt-12 text-4xl">
                <span className="text-muted-foreground">microfono di </span>
                <span className="font-bold">{currentSong.singerNickname}</span>
              </p>
            </>
          ) : (
            <h1 className="mt-6 text-6xl font-bold text-muted-foreground">
              In attesa del prossimo brano...
            </h1>
          )}
        </div>
        {nextSinger && (
          <div className="rounded-2xl bg-primary/10 p-6">
            <p className="text-xl uppercase tracking-widest text-muted-foreground">
              Prossimo
            </p>
            <p className="mt-2 text-4xl font-bold">
              {nextSinger.singerNickname}
            </p>
            <p className="text-2xl text-muted-foreground">{nextSinger.title}</p>
          </div>
        )}
      </section>

      <section className="flex flex-col rounded-3xl border border-border bg-card p-8">
        <h2 className="text-2xl font-bold">Coda</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {queue.length} {queue.length === 1 ? 'brano' : 'brani'} in attesa
        </p>
        <ul className="mt-6 flex-1 space-y-3 overflow-auto">
          {queue.map((item) => (
            <li key={item.id} className="rounded-xl border border-border p-3">
              <p className="text-lg font-semibold">
                {item.position && (
                  <span className="mr-2 text-muted-foreground">
                    #{item.position}
                  </span>
                )}
                {item.singerNickname}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {item.title}
              </p>
            </li>
          ))}
          {queue.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-3 text-muted-foreground">
              Nessun brano in coda
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}
