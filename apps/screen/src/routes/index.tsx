import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { env } from '../lib/env'
import { getOrCreateScreenToken } from '../lib/karaoke'

export const Route = createFileRoute('/')({ component: ScreenPairing })

type PairingState =
  | { status: 'loading' }
  | { status: 'waiting'; pairingCode: string; expiresAt: string }
  | { status: 'paired'; sessionCode: string }
  | { status: 'error'; message: string }

function ScreenPairing() {
  const navigate = useNavigate()
  const [state, setState] = useState<PairingState>({ status: 'loading' })
  const tokenRef = useRef<string | null>(null)

  useEffect(() => {
    const token = getOrCreateScreenToken()
    tokenRef.current = token

    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval> | null = null

    async function bootstrap() {
      try {
        const res = await fetch(`${env.serverUrl}/api/screens/pair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ screenToken: token }),
        })
        if (!res.ok) throw new Error('Pair failed')
        const json = (await res.json()) as {
          pairingCode: string
          expiresAt: string
        }
        if (cancelled) return
        setState({
          status: 'waiting',
          pairingCode: json.pairingCode,
          expiresAt: json.expiresAt,
        })
        pollTimer = setInterval(() => void pollStatus(token), 2000)
      } catch (err) {
        if (cancelled) return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Errore sconosciuto',
        })
      }
    }

    async function pollStatus(screenToken: string) {
      try {
        const res = await fetch(
          `${env.serverUrl}/api/screens/status?screenToken=${encodeURIComponent(screenToken)}`,
        )
        if (!res.ok) return
        const json = (await res.json()) as {
          paired: boolean
          sessionCode?: string | null
        }
        if (json.paired && json.sessionCode) {
          if (pollTimer) clearInterval(pollTimer)
          setState({ status: 'paired', sessionCode: json.sessionCode })
          void navigate({ to: '/live' })
        }
      } catch {
        // transient errors during polling: ignore
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [navigate])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background p-8 text-foreground">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="text-7xl">📺</span>
        <h1 className="text-5xl font-bold tracking-tight">Schermo Karaoke</h1>
      </header>

      {state.status === 'loading' && (
        <p className="text-xl text-muted-foreground">Preparazione...</p>
      )}

      {state.status === 'error' && (
        <p className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-xl text-destructive">
          Errore: {state.message}
        </p>
      )}

      {state.status === 'waiting' && (
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col items-center gap-4">
            <p className="text-2xl text-muted-foreground">
              Inserisci questo codice nel pannello DJ
            </p>
            <code className="rounded-2xl border border-border bg-card px-8 py-6 font-mono text-7xl font-bold tracking-widest">
              {state.pairingCode}
            </code>
            <p className="text-sm text-muted-foreground">
              Scade alle{' '}
              {new Date(state.expiresAt).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg text-muted-foreground">
              Oppure i partecipanti scansionano qui
            </p>
            <div className="rounded-2xl bg-white p-4">
              <QRCode value={env.participantJoinUrl} size={220} />
            </div>
            <p className="font-mono text-sm text-muted-foreground">
              {env.participantJoinUrl}
            </p>
          </div>
        </div>
      )}

      {state.status === 'paired' && (
        <p className="text-xl text-muted-foreground">
          Collegato alla sessione {state.sessionCode}, apertura tabellone...
        </p>
      )}
    </main>
  )
}
