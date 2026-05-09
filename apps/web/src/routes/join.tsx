import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import {
  NicknameSchema,
  SessionCodeSchema,
} from '@workspace/protocol/handshake'
import { Button } from '@workspace/ui/components/button'

export const Route = createFileRoute('/join')({
  component: JoinForm,
  validateSearch: z.object({ code: z.string().optional() }),
})

function JoinForm() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [code, setCode] = useState(search.code ?? '')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const codeResult = SessionCodeSchema.safeParse(code.trim().toUpperCase())
    if (!codeResult.success) {
      setError('Codice non valido (6 caratteri maiuscoli/cifre)')
      return
    }
    const nickResult = NicknameSchema.safeParse(nickname.trim())
    if (!nickResult.success) {
      setError('Nickname non valido (2-30 caratteri alfanumerici o underscore)')
      return
    }
    void navigate({
      to: '/session/$code',
      params: { code: codeResult.data },
      search: { nickname: nickResult.data },
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-8 text-foreground">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8"
      >
        <header className="space-y-2 text-center">
          <span className="text-5xl">🎤</span>
          <h1 className="text-2xl font-bold">Unisciti alla sessione</h1>
          <p className="text-sm text-muted-foreground">
            Inserisci il codice della sessione e scegli un nickname.
          </p>
        </header>
        <div className="space-y-2">
          <label className="text-sm font-medium">Codice sessione</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            className="w-full rounded-lg border border-border bg-background p-3 text-center font-mono text-xl tracking-widest uppercase"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Nickname</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={30}
            placeholder="Marco_99"
            className="w-full rounded-lg border border-border bg-background p-3"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" size="lg">
          Entra
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">
            ← Torna alla home
          </Link>
        </p>
      </form>
    </main>
  )
}
