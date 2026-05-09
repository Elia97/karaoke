import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@workspace/ui/components/button'
import { env } from '../lib/env'

export const Route = createFileRoute('/host/sessions/new')({
  component: NewSession,
})

function NewSession() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${env.serverUrl}/api/sessions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = (await res.json()) as { code?: string; error?: string }
      if (!res.ok || !json.code) {
        throw new Error(json.error ?? 'Creazione fallita')
      }
      void navigate({
        to: '/host/sessions/$code',
        params: { code: json.code },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-6 bg-background p-8 text-foreground">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Nuova sessione</h1>
        <Button asChild variant="ghost" size="sm">
          <Link to="/host">Indietro</Link>
        </Button>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome sessione</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="es. Compleanno Marco 2026"
            className="w-full rounded-lg border border-border bg-background p-3"
            required
            minLength={1}
            maxLength={100}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy || !name}>
            {busy ? 'Creo...' : 'Crea sessione'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </form>
    </main>
  )
}
